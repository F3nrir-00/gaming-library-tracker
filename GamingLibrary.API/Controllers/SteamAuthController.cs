using GamingLibrary.Core.Entities;
using GamingLibrary.Core.Interfaces;
using GamingLibrary.Infrastructure.Data;
using GamingLibrary.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace GamingLibrary.API.Controllers
{
    [Route("api/auth/steam")]
    [ApiController]
    public class SteamAuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SteamAuthController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IPlatformService _platformService;

        public SteamAuthController(
            ApplicationDbContext context,
            ILogger<SteamAuthController> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory, IPlatformService platformService)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _platformService = platformService;
        }

        /// <summary>
        /// Initiate Steam OpenID authentication
        /// Requires the user to be logged in (JWT) so we can link the Steam account
        /// </summary>
        [HttpGet("login")]
        [Authorize]
        public IActionResult Login()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var realm = $"{Request.Scheme}://{Request.Host}";
            var callbackUrl = $"{realm}/api/auth/steam/callback?userId={userId}";

            // Build Steam OpenID request
            var steamOpenIdUrl = "https://steamcommunity.com/openid/login" +
                $"?openid.ns=http://specs.openid.net/auth/2.0" +
                $"&openid.mode=checkid_setup" +
                $"&openid.return_to={Uri.EscapeDataString(callbackUrl)}" +
                $"&openid.realm={Uri.EscapeDataString(realm)}" +
                $"&openid.identity=http://specs.openid.net/auth/2.0/identifier_select" +
                $"&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select";

            _logger.LogInformation("User {UserId} initiating Steam authentication", userId);

            // Instead of returning Redirect, return the URL for the frontend to navigate to
            return Ok(new { redirectUrl = steamOpenIdUrl });
        }

        /// <summary>
        /// Handle Steam OpenID callback
        /// </summary>
        [HttpGet("callback")]
        public async Task<IActionResult> Callback([FromQuery] string userId)
        {
            _logger.LogInformation("Steam callback received for user: {UserId}", userId);

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("No userId in callback");
                return Redirect($"{_configuration["ClientUrl"]}/library?steamError=no_user_id");
            }

            // Validate the OpenID response
            var isValid = await ValidateSteamResponseAsync();

            if (!isValid)
            {
                _logger.LogWarning("Steam authentication validation failed");
                return Redirect($"{_configuration["ClientUrl"]}/library?steamError=validation_failed");
            }

            // Extract Steam ID from claimed_id
            var claimedId = Request.Query["openid.claimed_id"].ToString();
            var steamIdMatch = Regex.Match(claimedId, @"https://steamcommunity.com/openid/id/(\d+)");

            if (!steamIdMatch.Success)
            {
                _logger.LogWarning("Could not extract Steam ID from claimed_id: {ClaimedId}", claimedId);
                return Redirect($"{_configuration["ClientUrl"]}/library?steamError=no_steam_id");
            }

            var steamId = steamIdMatch.Groups[1].Value;
            _logger.LogInformation("Steam authentication successful. User: {UserId}, Steam ID: {SteamId}", userId, steamId);

            // Save or update platform connection
            try
            {
                var userIdInt = int.Parse(userId);

                var existingConnection = await _context.PlatformConnections
                    .FirstOrDefaultAsync(pc => pc.UserID == userIdInt && pc.Platform == "Steam");

                if (existingConnection != null)
                {
                    existingConnection.PlatformUserId = steamId;
                    existingConnection.IsActive = true;
                    existingConnection.ConnectedAt = DateTime.UtcNow;
                    _logger.LogInformation("Updated existing Steam connection for user {UserId}", userId);
                }
                else
                {
                    var connection = new PlatformConnection
                    {
                        UserID = userIdInt,
                        Platform = "Steam",
                        PlatformUserId = steamId,
                        IsActive = true,
                        ConnectedAt = DateTime.UtcNow
                    };
                    _context.PlatformConnections.Add(connection);
                    _logger.LogInformation("Created new Steam connection for user {UserId}", userId);
                }

                await _context.SaveChangesAsync();

                // Automatically sync the Steam library
                try
                {
                    _logger.LogInformation("Auto-syncing Steam library for user {UserId}", userId);
                    var gameCount = await _platformService.SyncUserGamesAsync(userIdInt, steamId);

                    // Update LastSyncedAt
                    if (existingConnection != null)
                    {
                        existingConnection.LastSyncedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        var connection = await _context.PlatformConnections
                            .FirstOrDefaultAsync(pc => pc.UserID == userIdInt && pc.Platform == "Steam");
                        if (connection != null)
                        {
                            connection.LastSyncedAt = DateTime.UtcNow;
                        }
                    }
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Steam library synced successfully for user {UserId}. Synced {GameCount} games",
                        userId, gameCount);

                    // Redirect with success and sync info
                    return Redirect($"{_configuration["ClientUrl"]}/library?steamSuccess=true&gamesSynced={gameCount}");
                }
                catch (Exception syncEx)
                {
                    _logger.LogWarning(syncEx, "Auto-sync failed for user {UserId}, but connection was saved", userId);
                    // Still redirect with success since the connection was saved
                    return Redirect($"{_configuration["ClientUrl"]}/library?steamSuccess=true&syncFailed=true");
                }
                // Redirect back to frontend with success
                return Redirect($"{_configuration["ClientUrl"]}/library?steamSuccess=true");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving Steam connection for user {UserId}", userId);
                return Redirect($"{_configuration["ClientUrl"]}/library?steamError=save_failed");
            }
        }

        private async Task<bool> ValidateSteamResponseAsync()
        {
            try
            {
                var queryString = Request.Query;

                // Build validation parameters
                var validationParams = new Dictionary<string, string>();

                foreach (var param in queryString)
                {
                    if (param.Key.StartsWith("openid."))
                    {
                        validationParams[param.Key] = param.Value!;
                    }
                }

                // Change mode to check_authentication for validation
                validationParams["openid.mode"] = "check_authentication";

                // Build form content
                var content = new FormUrlEncodedContent(validationParams);

                // Validate with Steam
                var httpClient = _httpClientFactory.CreateClient();
                var response = await httpClient.PostAsync("https://steamcommunity.com/openid/login", content);
                var responseText = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Steam validation response: {Response}", responseText);

                return responseText.Contains("is_valid:true");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating Steam response");
                return false;
            }
        }
    }
}
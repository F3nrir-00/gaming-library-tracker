using GamingLibrary.Core.Interfaces;
using GamingLibrary.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using GamingLibrary.Core.Entities;

namespace GamingLibrary.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PlatformController : ControllerBase
    {
        private readonly IPlatformService _platformService;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PlatformController> _logger;

        public PlatformController(IPlatformService platformService, ApplicationDbContext context, ILogger<PlatformController> logger)
        {
            _platformService = platformService;
            _context = context;
            _logger = logger;
        }

        [HttpPost("steam/connect")]
        public async Task<IActionResult> ConnectSteam([FromBody] ConnectSteamRequest request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (userId == 0)
                return Unauthorized(new { message = "Invalid user token" });

            if (string.IsNullOrWhiteSpace(request.SteamId))
                return BadRequest(new { message = "Steam ID required" });

            _logger.LogInformation("User {UserId} connecting Steam account: {SteamId}", userId, request.SteamId);

            var existingConeection = await _context.PlatformConnections.FirstOrDefaultAsync(pc => pc.UserID == userId && pc.Platform == "Steam");

            if (existingConeection != null)
            {
                existingConeection.PlatformUserId = request.SteamId;
                existingConeection.IsActive = true;
                existingConeection.ConnectedAt = DateTime.UtcNow;
            }
            else
            {
                var connection = new PlatformConnection
                {
                    UserID = userId,
                    Platform = "Steam",
                    PlatformUserId = request.SteamId,
                    IsActive = true,
                    ConnectedAt = DateTime.UtcNow
                };
                _context.PlatformConnections.Add(connection);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Steam account connected successfully",
                steamId = request.SteamId,
                platform = "Steam"
            });
        }

        [HttpPost("steam/sync")]
        public async Task<IActionResult> SyncSteam()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (userId == 0)
                return Unauthorized(new { message = "Invalid user token" });

            var connection = await _context.PlatformConnections.FirstOrDefaultAsync(pc => pc.UserID == userId && pc.Platform == "Steam" && pc.IsActive);

            if (connection == null)
                return BadRequest(new { message = "No steam account connected. Please connect a steam account first" });

            _logger.LogInformation("Syncing Steam games for user {UserId}, Steam ID: {SteamID}", userId, connection.PlatformUserId);

            try
            {
                var gamesSynced = await _platformService.SyncUserGamesAsync(userId, connection.PlatformUserId);

                return Ok(new
                {
                    message = "Steam library synced successfully",
                    gamesSynced,
                    lastSyncedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error syncing Steam games for user {UserId}", userId);
                return StatusCode(500, new { message = "An error occured while syncing your Steam library" });
            }
        }

        [HttpGet("connections")]
        public async Task<IActionResult> GetConnections()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (userId == 0)
                return Unauthorized(new { message = "Invalid user token" });

            var connections = await _context.PlatformConnections
                .Where(pc => pc.UserID == userId && pc.IsActive)
                .Select(pc => new
                {
                    pc.ConnectionID,
                    pc.Platform,
                    pc.PlatformUserId,
                    pc.ConnectedAt,
                    pc.LastSyncedAt,
                })
                .ToListAsync();

            return Ok(connections);
        }

        [HttpDelete("{platform}")]
        public async Task<IActionResult> DisconnectPlatform(string platform)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (userId == 0)
                return Unauthorized(new { message = "Invalid user token" });

            var connection = await _context.PlatformConnections.FirstOrDefaultAsync(pc => pc.UserID == userId && pc.Platform.ToLower() == platform.ToLower());

            if (connection == null)
                return NotFound(new { message = $"{platform} connection not found" });

            connection.IsActive = false;
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} disconnected {Platform}", userId, platform);

            return Ok(new { message = $"{platform} disconnected successfully" });
        }
    }

    public class ConnectSteamRequest
    {
        public string SteamId { get; set; } = string.Empty;
    }
}

using GamingLibrary.Core.DTOs.Steam;
using GamingLibrary.Core.Entities;
using GamingLibrary.Core.Interfaces;
using GamingLibrary.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace GamingLibrary.Infrastructure.Services
{
    public class SteamService : IPlatformService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        private readonly ILogger<SteamService> _logger;
        private readonly HttpClient _httpClient;
        private readonly IMetadataService _metadataService;
        private readonly string _steamApiKey;
        private readonly string _steamBaseUrl;

        public string PlatformName => "Steam";

        public SteamService (ApplicationDbContext context, IConfiguration config, ILogger<SteamService> logger, HttpClient httpClient, IMetadataService metadataService)
        {
            _context = context;
            _config = config;
            _logger = logger;
            _httpClient = httpClient;
            _metadataService = metadataService;

            _steamApiKey = _config["SteamApiSettings:ApiKey"] ?? throw new InvalidOperationException("Steam API Key not configured");
            _steamBaseUrl = _config["SteamApiSettings:BaseUrl"] ?? "https://api.steampowered.com";
        }

        public async Task<int> SyncUserGamesAsync(int userID, string platformUserId)
        {
            _logger.LogInformation("Starting Steam sync for user {UserId}, Steam ID: {SteamId}", userID, platformUserId);

            try
            {
                var steamGames = await GetUserGamesFromPlatformAsync(userID, platformUserId);

                if (steamGames.Count == 0)
                {
                    _logger.LogWarning($"No games found for Steam ID: {platformUserId}");
                    return 0;
                }

                var platformGameIds = steamGames.Select(g => g.PlatformGameID).ToList();
                var normalizedTitles = steamGames.Select(g => g.Game.NormalizedTitle).ToList();
                var existingGames = await _context.Games.Where(g => normalizedTitles.Contains(g.NormalizedTitle)).ToDictionaryAsync(g => g.NormalizedTitle);

                var existingUserGames = await _context.UserGames.Where(ug => ug.UserID == userID && ug.Platform == PlatformName && platformGameIds.Contains(ug.PlatformGameID)).ToDictionaryAsync(ug => ug.PlatformGameID);

                int gamesAdded = 0;
                int gamesUpdated = 0;
                var gamesToAdd = new List<Game>();
                var userGamesToAdd = new List<UserGame>();

                foreach (var userGame in steamGames)
                {
                    var normalizedTitle = userGame.Game.NormalizedTitle;

                    existingGames.TryGetValue(normalizedTitle, out var existingGame);
                    if (existingGame == null)
                    {
                        var enrichedGame = await _metadataService.EnrichGameMetadataAsync(userGame.Game);
                        gamesToAdd.Add(enrichedGame);
                        existingGame = enrichedGame;

                        existingGames[normalizedTitle] = enrichedGame;
                    }
                    else
                    {
                        if (string.IsNullOrEmpty(existingGame.Developer) || string.IsNullOrEmpty(existingGame.Publisher) || string.IsNullOrEmpty(existingGame.Description))
                            existingGame = await _metadataService.EnrichGameMetadataAsync(existingGame);

                        existingGame.CoverImageURL = userGame.Game.CoverImageURL;
                    }

                    if(existingUserGames.TryGetValue(userGame.PlatformGameID, out var existingUserGame))
                    {
                        existingUserGame.PlaytimeMinutes = userGame.PlaytimeMinutes;
                        existingUserGame.LastPlayedAt = userGame.LastPlayedAt;
                        gamesUpdated++;
                    }
                    else 
                    {
                        userGame.Game = existingGame;
                        userGamesToAdd.Add(userGame);
                        gamesAdded++;
                    }
                }

                if(gamesToAdd.Any())
                {
                    await _context.Games.AddRangeAsync(gamesToAdd);
                    await _context.SaveChangesAsync();
                }

                foreach (var userGame in userGamesToAdd)
                {
                    if(userGame.GameID == 0)
                    {
                        var matchedGame = existingGames[userGame.Game.NormalizedTitle];
                        userGame.GameID = matchedGame.GameID;
                    }
                }

                if(userGamesToAdd.Any())
                {
                    await _context.UserGames.AddRangeAsync(userGamesToAdd);
                    await _context.SaveChangesAsync();
                }

                var connection = await _context.PlatformConnections.FirstOrDefaultAsync(pc => pc.UserID == userID && pc.Platform == PlatformName);

                if(connection != null)
                {
                    connection.LastSyncedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                _logger.LogInformation($"Steam sync completed. Added {gamesAdded}, Updated {gamesUpdated}");
                return gamesAdded + gamesUpdated;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error synciing Steam games for user {userId}", platformUserId);
                throw;
            }
        }

        public async Task<List<UserGame>> GetUserGamesFromPlatformAsync(int userId, string platformUserID)
        {
            var url = $"{_steamBaseUrl}/IPlayerService/GetOwnedGames/v1" +
                      $"?key={_steamApiKey}" +
                      $"&steamid={platformUserID}" +
                      $"&include_appinfo=1" +
                      $"&include_played_free_games=1" +
                      $"&format=json";

            _logger.LogInformation("Fetching games from Steam API for Steam ID: {SteamId}", platformUserID);

            var response = await _httpClient.GetAsync(url);

            if(!response.IsSuccessStatusCode)
            {
                _logger.LogError("Steam API request failed with status {StatusCode}", response.StatusCode);
                throw new HttpRequestException($"Steam API request failed: {response.StatusCode}");
            }

            var content = await response.Content.ReadAsStringAsync();
            var steamResponse = JsonSerializer.Deserialize<SteamLibraryResponse>(content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if(steamResponse?.Response?.Games == null)
            {
                _logger.LogWarning("No games return from Steam API for Steam ID: {SteamID}", platformUserID);
                return new List<UserGame>();
            }

            var userGames = new List<UserGame>();

            foreach(var steamGame in steamResponse.Response.Games)
            {
                var userGame = new UserGame
                {
                    UserID = userId,
                    Platform = PlatformName,
                    PlatformGameID = steamGame.AppID.ToString(),
                    PlaytimeMinutes = steamGame.PlaytimeForever,
                    LastPlayedAt = steamGame.RtimeLastPlayed.HasValue ? DateTimeOffset.FromUnixTimeSeconds(steamGame.RtimeLastPlayed.Value).DateTime : null,
                    AddedAt = DateTime.UtcNow,
                    Game = new Game
                    {
                        Title = steamGame.Name,
                        NormalizedTitle = NormalizeTitle(steamGame.Name),
                        CoverImageURL = GetSteamImageUrl(steamGame.AppID),
                        CreatedAt = DateTime.UtcNow
                    }
                };

                userGames.Add(userGame);
            }

            _logger.LogInformation("Fetched {Count} games from Steam API", userGames.Count);
            return userGames;
        }

        public async Task<string> ResolveUsernameAsync(string username)
        {
            var url = $"{_steamBaseUrl}/ISteamUser/ResolveVanityURL/v1/?key={_steamApiKey}&vanityurl={username}";

            _logger.LogInformation("Resolving Steam username: {USername}", username);

            var response = await _httpClient.GetAsync(url);

            if(!response.IsSuccessStatusCode)
            {
                _logger.LogError("Steam API request failed with status: {StatusCode}", response.StatusCode);
                throw new HttpRequestException($"Steam API request failed: {response.StatusCode}");
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<SteamVanityURLResponse>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (result?.Response?.Success != 1)
                throw new InvalidOperationException("Steam username not found. Please check the username and try again");

            return result.Response.SteamId;
        }

        private string NormalizeTitle(string title)
        {
            return title.ToLowerInvariant()
                .Replace("@", "")
                .Replace("™", "")
                .Replace(":", "")
                .Trim();
        }

        private string? GetSteamImageUrl(int appId)
        {
            return $"https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg";
        }
    }

    internal class SteamVanityURLResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("response")]
        public SteamVanityURLData Response { get; set; } = new();
    }

    internal class SteamVanityURLData
    {
        [System.Text.Json.Serialization.JsonPropertyName("steamid")]
        public string SteamId { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("success")]
        public int Success { get; set; }
    }
}

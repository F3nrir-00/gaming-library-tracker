using GamingLibrary.Core.DTOs.IGDB;
using GamingLibrary.Core.Entities;
using GamingLibrary.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;

namespace GamingLibrary.Infrastructure.Services
{
    public class IgdbService : IMetadataService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<IgdbService> _logger;
        private readonly string _clientId;
        private readonly string _clientSecret;
        private readonly string _tokenUrl;
        private readonly string _baseUrl;
        private readonly SemaphoreSlim _rateLimiter = new SemaphoreSlim(1, 1);
        private DateTime _lastRequestTime = DateTime.MinValue;
        private const int MinRequestIntervalMs = 275;

        // Token cache
        private string? _accessToken;
        private DateTime _tokenExpiry = DateTime.MinValue;

        public IgdbService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<IgdbService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;

            _clientId = _configuration["IgdbSettings:ClientId"]
                ?? throw new InvalidOperationException("IGDB Client ID not configured");
            _clientSecret = _configuration["IgdbSettings:ClientSecret"]
                ?? throw new InvalidOperationException("IGDB Client Secret not configured");
            _tokenUrl = _configuration["IgdbSettings:TokenUrl"]
                ?? "https://id.twitch.tv/oauth2/token";
            _baseUrl = _configuration["IgdbSettings:BaseUrl"]
                ?? "https://api.igdb.com/v4";
        }

        public async Task<Game> EnrichGameMetadataAsync(Game game)
        {
            try
            {
                var igdbGame = await SearchGameAsync(game.Title);

                if (igdbGame == null)
                {
                    _logger.LogWarning("No IGDB match found for game: {Title}", game.Title);
                    return game;
                }

                // Update game metadata
                game.Description = igdbGame.Summary;

                // Set release date from Unix timestamp
                if (igdbGame.FirstReleaseDate.HasValue)
                {
                    game.ReleaseDate = DateTimeOffset
                        .FromUnixTimeSeconds(igdbGame.FirstReleaseDate.Value)
                        .DateTime;
                }

                // Get developer and publisher from involved companies
                if (igdbGame.InvolvedCompanies != null)
                {
                    game.Developer = igdbGame.InvolvedCompanies
                        .FirstOrDefault(c => c.IsDeveloper)
                        ?.Company?.Name;

                    game.Publisher = igdbGame.InvolvedCompanies
                        .FirstOrDefault(c => c.IsPublisher)
                        ?.Company?.Name;
                }

                // Use IGDB cover if we don't have one
                if (string.IsNullOrEmpty(game.CoverImageURL) && igdbGame.Cover?.Url != null)
                {
                    // IGDB returns URLs like //images.igdb.com/...
                    // We want higher resolution (t_cover_big instead of t_thumb)
                    game.CoverImageURL = "https:" + igdbGame.Cover.Url
                        .Replace("t_thumb", "t_cover_big");
                }

                return game;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enriching metadata for game: {Title}", game.Title);
                return game; // Return un-enriched game rather than failing
            }
        }

        public async Task<IgdbGame?> SearchGameAsync(string title)
        {
            // Attempt to match exact title
            var result = await ExecuteTitleSearchAsync(title);
            if (result != null) return result;

            // Attempt to search with clean title
            var cleanedTitle = CleanTitleForSearch(title);
            if(cleanedTitle != title)
            {
                result = await ExecuteTitleSearchAsync(cleanedTitle);
                if(result != null) return result;
            }

            // Attempt to search with base title
            var baseTitle = GetBaseTitle(cleanedTitle);
            if (baseTitle != cleanedTitle)
            {
                result = await ExecuteTitleSearchAsync(baseTitle);
                if (result != null) return result;
            }

            _logger.LogWarning($"No IGDB match found after all strategies for: {title}");
            return null;
        }

        private async Task<IgdbGame?> ExecuteTitleSearchAsync(string title)
        {
            await EnsureValidTokenAsync();

            await _rateLimiter.WaitAsync();
            try
            {
                var timeSinceLastRequest = (DateTime.UtcNow - _lastRequestTime).TotalMilliseconds;
                if (timeSinceLastRequest < MinRequestIntervalMs)
                {
                    await Task.Delay((int)(MinRequestIntervalMs - timeSinceLastRequest));
                }
                _lastRequestTime = DateTime.UtcNow;

                var query = $"""
                    search "{title}";
                    fields name, summary, first_release_date, 
                           cover.url,
                           involved_companies.company.name,
                           involved_companies.developer,
                           involved_companies.publisher,
                           genres.name;
                    limit 1;
                    """;

                var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/games")
                {
                    Content = new StringContent(query, Encoding.UTF8, "text/plain")
                };

                request.Headers.Add("Client-ID", _clientId);
                request.Headers.Add("Authorization", $"Bearer {_accessToken}");

                var response = await _httpClient.SendAsync(request);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("IGDB API request failed: {StatusCode}", response.StatusCode);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync();
                var games = JsonSerializer.Deserialize<List<IgdbGame>>(content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return games?.FirstOrDefault();
            }
            finally
            {
                _rateLimiter.Release();
            }
        }

        private async Task EnsureValidTokenAsync()
        {
            // Check if token is still valid (with 5 minute buffer)
            if (_accessToken != null && DateTime.UtcNow < _tokenExpiry.AddMinutes(-5))
            {
                return;
            }

            _logger.LogInformation("Fetching new IGDB access token");

            var tokenRequest = new HttpRequestMessage(HttpMethod.Post, _tokenUrl);
            tokenRequest.Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                { "client_id", _clientId },
                { "client_secret", _clientSecret },
                { "grant_type", "client_credentials" }
            });

            var response = await _httpClient.SendAsync(tokenRequest);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var tokenResponse = JsonSerializer.Deserialize<TwitchTokenResponse>(content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            _accessToken = tokenResponse?.AccessToken
                ?? throw new InvalidOperationException("Failed to get IGDB access token");

            // Token expires in ~60 days, store expiry time
            _tokenExpiry = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);

            _logger.LogInformation("IGDB token obtained, expires: {Expiry}", _tokenExpiry);
        }

        private string CleanTitleForSearch(string title)
        {
            return title
                .Replace("®", "")
                .Replace("™", "")
                .Replace("©", "")
                .Replace(" - ", ": ")       // Normalize dash separators
                .Replace("GOTY", "")        // Remove edition markers
                .Replace("Game of the Year Edition", "")
                .Replace("Definitive Edition", "")
                .Replace("Complete Edition", "")
                .Replace("Enhanced Edition", "")
                .Replace("Remastered", "")
                .Trim();
        }

        private string GetBaseTitle(string title)
        {
            // Return just the part before a colon or dash
            // e.g. "Dark Souls: Remastered" → "Dark Souls"
            var colonIndex = title.IndexOf(':');
            if (colonIndex > 3) // Avoid trimming very short titles
            {
                return title[..colonIndex].Trim();
            }

            return title;
        }
    }

    // Twitch token response model
    internal class TwitchTokenResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("token_type")]
        public string TokenType { get; set; } = string.Empty;
    }
}
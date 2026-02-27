using GamingLibrary.Core.DTOs.IGDB;
using GamingLibrary.Core.Entities;
using GamingLibrary.Infrastructure.Data;
using GamingLibrary.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GamingLibrary.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class GamesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<GamesController> _logger;
        private readonly IgdbService _igdbService;

        public GamesController(IgdbService igdbService, ApplicationDbContext context, ILogger<GamesController> logger)
        {
            _igdbService = igdbService;
            _context = context;
            _logger = logger;
        }

        [HttpGet("library")]
        public async Task<IActionResult> GetMyLibrary([FromQuery] string? platform = null, [FromQuery] string? status = null, [FromQuery] string? search = null, [FromQuery] string sortBy = "playtime", [FromQuery] string sortOrder = "desc")
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (userId == 0) return Unauthorized();

            var query = _context.UserGames
                .Include(ug => ug.Game)
                .Where(ug => ug.UserID == userId);

            // Filter by platform
            if (!string.IsNullOrWhiteSpace(platform))
                query = query.Where(ug => ug.Platform.ToLower() == platform.ToLower());

            // Filter by status
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(ug => ug.Status != null && ug.Status.ToLower() == status.ToLower());

            // Search by title
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(ug => ug.Game.Title.Contains(search));

            // Sorting
            query = sortBy.ToLower() switch
            {
                "playtime" => sortOrder == "asc"
                    ? query.OrderBy(ug => ug.PlaytimeMinutes)
                    : query.OrderByDescending(ug => ug.PlaytimeMinutes),
                "lastplayed" => sortOrder == "asc"
                    ? query.OrderBy(ug => ug.LastPlayedAt)
                    : query.OrderByDescending(ug => ug.LastPlayedAt),
                "title" => sortOrder == "asc"
                    ? query.OrderBy(ug => ug.Game.Title)
                    : query.OrderByDescending(ug => ug.Game.Title),
                "added" => sortOrder == "asc"
                    ? query.OrderBy(ug => ug.AddedAt)
                    : query.OrderByDescending(ug => ug.AddedAt),
                _ => query.OrderByDescending(ug => ug.PlaytimeMinutes)
            };

            var games = await query
                .Select(ug => new
                {
                    ug.UserGameID,
                    ug.Platform,
                    ug.PlatformGameID,
                    GameTitle = ug.Game.Title,
                    ug.Game.CoverImageURL,
                    ug.Game.BannerImageUrl,
                    ug.Game.Developer,
                    ug.Game.Publisher,
                    ug.PlaytimeMinutes,
                    PlaytimeHours = Math.Round(ug.PlaytimeMinutes / 60.0, 1),
                    ug.LastPlayedAt,
                    ug.Status,
                    ug.AddedAt
                })
                .ToListAsync();

            return Ok(new
            {
                totalGames = games.Count,
                totalPlaytimeHours = Math.Round(games.Sum(g => g.PlaytimeHours), 1),
                filters = new { platform, status, search, sortBy, sortOrder },
                games
            });
        }

        [HttpGet("library/{userGameId}")]
        public async Task<IActionResult> GetGame(int userGameId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (userId == 0)
                return Unauthorized(new { message = "Invalid user token" });

            var userGame = await _context.UserGames.Include(ug => ug.Game).Include(ug => ug.JournalEntries).FirstOrDefaultAsync(ug => ug.UserGameID == userGameId && ug.UserID == userId);

            if (userGame == null)
                return NotFound(new { message = "Game not found in your library" });

            return Ok(new
            {
                userGame.UserGameID,
                userGame.Platform,
                userGame.PlatformGameID,
                game = new
                {
                    userGame.Game.GameID,
                    userGame.Game.Title,
                    userGame.Game.BannerImageUrl,
                    userGame.Game.Description,
                    userGame.Game.CoverImageURL,
                    userGame.Game.ReleaseDate,
                    userGame.Game.Developer,
                    userGame.Game.Publisher
                },
                userGame.PlaytimeMinutes,
                playtimeHours = Math.Round(userGame.PlaytimeMinutes / 60.0, 1),
                userGame.LastPlayedAt,
                userGame.Status,
                userGame.AddedAt,
                journalEntryCount = userGame.JournalEntries.Count
            });
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (userId == 0)
                return Unauthorized(new { message = "Invalid user token" });

            var userGames = await _context.UserGames.Include(ug => ug.Game).Where(ug => ug.UserID == userId).ToListAsync();

            var totalGames = userGames.Count;
            var totalPlaytimeMinutes = userGames.Sum(ug => ug.PlaytimeMinutes);
            var gamesByPlatform = userGames.GroupBy(ug => ug.Platform).Select(g => new
            {
                platform = g.Key,
                count = g.Count(),
                playtimeHours = Math.Round(g.Sum(ug => ug.PlaytimeMinutes) / 60.0, 1)
            }).ToList();

            var mostPlayedGame = userGames.OrderByDescending(ug => ug.PlaytimeMinutes).Select(ug => new
            {
                ug.Game.Title,
                playtimeHours = Math.Round(ug.PlaytimeMinutes / 60.0, 1)
            }).FirstOrDefault();

            return Ok(new
            {
                totalGames,
                totalPlaytimeHours = Math.Round(totalPlaytimeMinutes / 60.0, 1),
                gamesByPlatform,
                mostPlayedGame
            });
        }

        [HttpPut("library/{userGameId}/status")]
        public async Task<IActionResult> UpdateGameStatus(int userGameId,[FromBody] UpdateGameStatusRequest request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (userId == 0) return Unauthorized();

            // Validate status value
            var validStatuses = new[] { "Not Started", "In Progress", "Completed", "Abandoned" };
            if (!validStatuses.Contains(request.Status))
            {
                return BadRequest(new
                {
                    message = "Invalid status",
                    validStatuses
                });
            }

            var userGame = await _context.UserGames
                .Include(ug => ug.Game)
                .FirstOrDefaultAsync(ug => ug.UserGameID == userGameId && ug.UserID == userId);

            if (userGame == null)
                return NotFound(new { message = "Game not found in your library" });

            userGame.Status = request.Status;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Game {GameTitle} status updated to {Status} by user {UserId}",
                userGame.Game.Title, request.Status, userId);

            return Ok(new
            {
                userGameId,
                gameTitle = userGame.Game.Title,
                status = userGame.Status,
                message = "Status updated successfully"
            });
        }

        /// <summary>
        /// Manually add a game to the user's library
        /// </summary>
        [HttpPost("library/manual")]
        public async Task<IActionResult> AddGameManually([FromBody] ManualGameRequest request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (userId == 0)
            {
                return Unauthorized(new { message = "Invalid user token" });
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { message = "Game title is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Platform))
            {
                return BadRequest(new { message = "Platform is required" });
            }

            _logger.LogInformation("User {UserId} manually adding game: {Title} ({Platform}), IGDB ID: {IgdbId}",
                userId, request.Title, request.Platform, request.IgdbID);

            try
            {
                Game? game = null;

                // If IGDB ID provided, try to find game by IGDB ID first
                if (request.IgdbID.HasValue)
                {
                    game = await _context.Games
                        .FirstOrDefaultAsync(g => g.IgdbId == request.IgdbID.Value);
                }

                // If not found by IGDB ID, try by title
                if (game == null)
                {
                    game = await _context.Games
                        .FirstOrDefaultAsync(g => g.Title.ToLower() == request.Title.ToLower());
                }

                if (game == null)
                {
                    // Fetch metadata from IGDB
                    IgdbGame? igdbGame = null;

                    if (request.IgdbID.HasValue)
                    {
                        // Fetch by ID if we have it (more accurate)
                        igdbGame = await _igdbService.GetGameByIdAsync(request.IgdbID.Value);
                    }

                    if (igdbGame == null)
                    {
                        // Fallback to search by title
                        igdbGame = await _igdbService.SearchGameAsync(request.Title);
                    }

                    if (igdbGame != null)
                    {
                        // Create game with IGDB metadata
                        game = new Game
                        {
                            Title = igdbGame.Name,
                            IgdbId = igdbGame.ID,
                            Developer = igdbGame.InvolvedCompanies?
                                .FirstOrDefault(ic => ic.IsDeveloper)?.Company?.Name,
                            Publisher = igdbGame.InvolvedCompanies?
                                .FirstOrDefault(ic => ic.IsPublisher)?.Company?.Name,
                            ReleaseDate = igdbGame.FirstReleaseDate.HasValue
                                ? DateTimeOffset.FromUnixTimeSeconds(igdbGame.FirstReleaseDate.Value).DateTime
                                : null,
                            CoverImageURL = igdbGame.Cover?.Url != null
                                ? $"https:{igdbGame.Cover.Url.Replace("t_thumb", "t_cover_big")}"
                                : null,
                            BannerImageUrl = igdbGame.Artworks?[0].Url != null
                                ? $"https:{igdbGame.Artworks[0].Url?.Replace("t_thumb", "t_screenshot_huge")}"
                                : igdbGame.Screenshots?[0].Url != null
                                ? $"https:{igdbGame.Screenshots[0].Url?.Replace("t_thumb", "t_screenshot_huge")}" : null,
                        };
                        _logger.LogInformation("Fetched IGDB metadata for: {Title} (ID: {IgdbId})",
                            game.Title, game.IgdbId);
                    }
                    else
                    {
                        // Create game without metadata
                        game = new Game
                        {
                            Title = request.Title,
                        };
                        _logger.LogInformation("No IGDB metadata found for: {Title}", request.Title);
                    }

                    _context.Games.Add(game);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Created new game entry: {GameId} - {Title}", game.GameID, game.Title);
                }
                else
                {
                    _logger.LogInformation("Game already exists in database: {GameId} - {Title}",
                        game.GameID, game.Title);
                }

                // Check if user already has this game on this platform
                var existingUserGame = await _context.UserGames
                    .FirstOrDefaultAsync(ug => ug.UserID == userId
                        && ug.GameID == game.GameID
                        && ug.Platform == request.Platform);

                if (existingUserGame != null)
                {
                    return Conflict(new { message = "You already have this game in your library on this platform" });
                }

                // Add to user's library
                var userGame = new UserGame
                {
                    UserID = userId,
                    GameID = game.GameID,
                    Platform = request.Platform,
                    PlatformGameID = $"manual-{Guid.NewGuid()}",
                    PlaytimeMinutes = request.PlaytimeHours.HasValue
                        ? (int)(request.PlaytimeHours.Value * 60)
                        : 0,
                    Status = request.Status,
                    AddedAt = DateTime.UtcNow,
                    LastPlayedAt = request.PlaytimeHours.HasValue && request.PlaytimeHours.Value > 0
                        ? DateTime.UtcNow
                        : null
                };

                _context.UserGames.Add(userGame);
                await _context.SaveChangesAsync();

                _logger.LogInformation("User {UserId} added game {GameId} manually with metadata", userId, game.GameID);

                // Return the created game with metadata
                var response = new
                {
                    userGameId = userGame.UserGameID,
                    gameId = game.GameID,
                    gameTitle = game.Title,
                    platform = userGame.Platform,
                    playtimeHours = userGame.PlaytimeMinutes / 60.0,
                    status = userGame.Status,
                    addedAt = userGame.AddedAt,
                    coverImageUrl = game.CoverImageURL,
                    bannerImageUrl = game.BannerImageUrl,
                    developer = game.Developer,
                    publisher = game.Publisher,
                    releaseDate = game.ReleaseDate
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error manually adding game for user {UserId}", userId);
                return StatusCode(500, new { message = "Failed to add game to library" });
            }
        }

        [HttpDelete("library/{userGameId}")]
        public async Task<IActionResult> DeleteGame(int userGameId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (userId == 0)
            {
                return Unauthorized(new { message = "Invalid user token" });
            }

            var userGame = await _context.UserGames
                .Include(ug => ug.JournalEntries)
                .FirstOrDefaultAsync(ug => ug.UserGameID == userGameId);

            if (userGame == null)
            {
                return NotFound(new { message = "Game not found in your library" });
            }

            // Verify ownership
            if (userGame.UserID != userId)
            {
                return Forbid();
            }

            _logger.LogInformation("User {UserId} deleting game {UserGameId} ({Title})",
                userId, userGameId, userGame.Game?.Title ?? "Unknown");

            // Delete the game (cascade will delete journal entries)
            _context.UserGames.Remove(userGame);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Game {UserGameId} deleted successfully for user {UserId}", userGameId, userId);

            return Ok(new { message = "Game removed from library" });
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchGames([FromQuery] string query)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (userId == 0)
            {
                return Unauthorized(new { message = "Invalid user token" });
            }

            if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
            {
                return BadRequest(new { message = "Query must be at least 2 characters" });
            }

            _logger.LogInformation("User {UserId} searching for games: {Query}", userId, query);

            try
            {
                var games = await _igdbService.SearchGamesAsync(query, limit: 10);

                var results = games.Select(g => new
                {
                    igdbId = g.ID,
                    title = g.Name,
                    coverImageUrl = g.Cover?.Url != null
                        ? $"https:{g.Cover.Url.Replace("t_thumb", "t_cover_big")}"
                        : null,
                    developer = g.InvolvedCompanies?
                        .FirstOrDefault(ic => ic.IsDeveloper)?.Company?.Name,
                    publisher = g.InvolvedCompanies?
                        .FirstOrDefault(ic => ic.IsPublisher)?.Company?.Name,
                    releaseYear = g.FirstReleaseDate.HasValue
                        ? DateTimeOffset.FromUnixTimeSeconds(g.FirstReleaseDate.Value).Year
                        : (int?)null
                }).ToList();

                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching games for query: {Query}", query);
                return StatusCode(500, new { message = "Failed to search games" });
            }
        }
    }



    public class UpdateGameStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    public class ManualGameRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public double? PlaytimeHours { get; set; }
        public string? Status { get; set; }
        public int? IgdbID { get; set; }
    }
}

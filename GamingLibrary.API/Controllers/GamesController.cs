using GamingLibrary.Infrastructure.Data;
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

        public GamesController(ApplicationDbContext context, ILogger<GamesController> logger)
        {
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
    }

    public class UpdateGameStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}

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
        public async Task<IActionResult> GetMyLibrary([FromQuery] string? platform = null)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (userId == 0)
                return Unauthorized(new { message = "Invalid user token" });

            var query = _context.UserGames.Include(ug => ug.Game).Where(ug => ug.UserID == userId);

            if(!string.IsNullOrWhiteSpace(platform))
                query = query.Where(ug => ug.Platform.ToLower() == platform.ToLower());

            var games = await query.OrderByDescending(ug => ug.PlaytimeMinutes).Select(ug => new
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
            }).ToListAsync();

            return Ok(new
            {
                totalGames = games.Count,
                totalPlaytimeHours = Math.Round(games.Sum(g => g.PlaytimeHours), 1),
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

            var userGames = await _context.UserGames.Where(ug => ug.UserID == userId).ToListAsync();

            var totalGames = userGames.Count;
            var totalPlaytimeMinutes = userGames.Sum(ug => ug.PlaytimeMinutes);
            var gamesByPlatform = userGames.GroupBy(ug => ug.Platform).Select(g => new
            {
                platform = g.Key,
                count = g.Count(),
                playtimeHours = Math.Round(g.Sum(ug => ug.PlaytimeMinutes) / 60.0, 1)
            }).ToList;

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
    }
}

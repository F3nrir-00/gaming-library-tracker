using GamingLibrary.Core.DTOs.Journal;
using GamingLibrary.Core.Entities;
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
    public class JournalController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<JournalController> _logger;

        public JournalController(ApplicationDbContext context, ILogger<JournalController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("game/{userGameId}")]
        public async Task<IActionResult> GetEntriesForGame(int userGameId)
        {
            var userId = GetUserId();
            if (userId == 0) return Unauthorized();

            var userGame = await _context.UserGames.Include(ug => ug.Game).FirstOrDefaultAsync(ug => ug.UserGameID == userGameId && ug.UserID == userId);

            if(userGame == null) return NotFound(new { message = "Game not found in your library" });

            var entries = await _context.JournalEntries.Where(je => je.UserGameID == userGameId).OrderByDescending(je => je.CreatedAt).Select(je => new JournalEntryResponse
            {
                EntryID = je.EntryID,
                UserGameID = je.UserGameID,
                GameTitle = userGame.Game.Title,
                Content = je.Content,
                Rating = je.Rating,
                SessionDurationMinutes = je.SessionDurationMinutes,
                Tags = je.Tags,
                CreatedAt = je.CreatedAt,
                UpdatedAt = je.UpdatedAt
            }).ToListAsync();

            return Ok(new
            {
                userGameId,
                gameTitle = userGame.Game.Title,
                totalEntries = entries.Count,
                averageRating = entries.Where(e => e.Rating.HasValue).Select(e => e.Rating!.Value).DefaultIfEmpty(0).Average(),
                entries
            });
        }

        [HttpGet("{entryId}")]
        public async Task<IActionResult> GetEntry(int entryId)
        {
            var userId = GetUserId();
            if (userId == 0) return Unauthorized();

            var entry = await _context.JournalEntries.Include(je => je.UserGame).ThenInclude(ug => ug.Game).FirstOrDefaultAsync(je => je.EntryID == entryId);

            if (entry == null) return NotFound(new { message = "Journal entry not found" });

            if (entry.UserGame.UserID != userId) return Forbid();

            return Ok(new JournalEntryResponse
            {
                EntryID = entry.EntryID,
                UserGameID = entry.UserGameID,
                GameTitle = entry.UserGame.Game.Title,
                Content = entry.Content,
                Rating = entry.Rating,
                SessionDurationMinutes = entry.SessionDurationMinutes,
                Tags = entry.Tags,
                CreatedAt = entry.CreatedAt,
                UpdatedAt = entry.UpdatedAt
            });
        }

        [HttpPost("game/{userGameId}")]
        public async Task<IActionResult> CreateEntry(int userGameId, [FromBody] CreateJournalEntryRequest request)
        {
            var userId = GetUserId();
            if (userId == 0) return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Content))
                return BadRequest(new { message = "Journal entry content is required" });

            if (request.Rating.HasValue && (request.Rating < 1 || request.Rating > 10))
                return BadRequest(new { message = "Rating must be between 1 and 10" });

            var userGame = await _context.UserGames
                .Include(ug => ug.Game)
                .FirstOrDefaultAsync(ug => ug.UserGameID == userGameId && ug.UserID == userId);

            if (userGame == null)
                return NotFound(new { message = "Game not found in your library" });

            var entry = new JournalEntry
            {
                UserGameID = userGameId,
                Content = request.Content,
                Rating = request.Rating,
                SessionDurationMinutes = request.SessionDurationMinutes,
                Tags = request.Tags,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.JournalEntries.Add(entry);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Journal entry created for game {GameTitle} by user {UserId}",
                userGame.Game.Title, userId);

            return CreatedAtAction(nameof(GetEntry), new { entryId = entry.EntryID },
                new JournalEntryResponse
                {
                    EntryID = entry.EntryID,
                    UserGameID = entry.UserGameID,
                    GameTitle = userGame.Game.Title,
                    Content = entry.Content,
                    Rating = entry.Rating,
                    SessionDurationMinutes = entry.SessionDurationMinutes,
                    Tags = entry.Tags,
                    CreatedAt = entry.CreatedAt,
                    UpdatedAt = entry.UpdatedAt
                });
        }

        [HttpPut("{entryId}")]
        public async Task<IActionResult> UpdateEntry(int entryId, [FromBody] UpdateJournalEntryRequest request)
        {
            var userId = GetUserId();
            if (userId == 0) return Unauthorized();

            if (request.Rating.HasValue && (request.Rating < 1 || request.Rating > 10))
                return BadRequest(new { message = "Rating must be between 1 and 10" });

            var entry = await _context.JournalEntries
                .Include(je => je.UserGame)
                    .ThenInclude(ug => ug.Game)
                .FirstOrDefaultAsync(je => je.EntryID == entryId);

            if (entry == null)
                return NotFound(new { message = "Journal entry not found" });

            if (entry.UserGame.UserID != userId)
                return Forbid();

            if (!string.IsNullOrWhiteSpace(request.Content))
                entry.Content = request.Content;

            if (request.Rating.HasValue)
                entry.Rating = request.Rating;

            if (request.SessionDurationMinutes.HasValue)
                entry.SessionDurationMinutes = request.SessionDurationMinutes;

            if (request.Tags != null)
                entry.Tags = request.Tags;

            entry.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Journal entry {EntryId} updated by user {UserId}", entryId, userId);

            return Ok(new JournalEntryResponse
            {
                EntryID = entry.EntryID,
                UserGameID = entry.UserGameID,
                GameTitle = entry.UserGame.Game.Title,
                Content = entry.Content,
                Rating = entry.Rating,
                SessionDurationMinutes = entry.SessionDurationMinutes,
                Tags = entry.Tags,
                CreatedAt = entry.CreatedAt,
                UpdatedAt = entry.UpdatedAt
            });
        }

        [HttpDelete("{entryId}")]
        public async Task<IActionResult> DeleteEntry(int entryId)
        {
            var userId = GetUserId();
            if (userId == 0) return Unauthorized();

            var entry = await _context.JournalEntries
                .Include(je => je.UserGame)
                .FirstOrDefaultAsync(je => je.EntryID == entryId);

            if (entry == null)
                return NotFound(new { message = "Journal entry not found" });

            if (entry.UserGame.UserID != userId)
                return Forbid();

            _context.JournalEntries.Remove(entry);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Journal entry {EntryId} deleted by user {UserId}", entryId, userId);

            return Ok(new { message = "Journal entry deleted successfully" });
        }

        [HttpGet("my-entries")]
        public async Task<IActionResult> GetMyEntries([FromQuery] string? tags = null, [FromQuery] int? minRating = null)
        {
            var userId = GetUserId();
            if (userId == 0) return Unauthorized();

            var query = _context.JournalEntries
                .Include(je => je.UserGame)
                    .ThenInclude(ug => ug.Game)
                .Where(je => je.UserGame.UserID == userId);

            // Filter by tags if provided
            if (!string.IsNullOrWhiteSpace(tags))
                query = query.Where(je => je.Tags != null && je.Tags.Contains(tags));

            // Filter by minimum rating if provided
            if (minRating.HasValue)
                query = query.Where(je => je.Rating >= minRating);

            var entries = await query
                .OrderByDescending(je => je.CreatedAt)
                .Select(je => new JournalEntryResponse
                {
                    EntryID = je.EntryID,
                    UserGameID = je.UserGameID,
                    GameTitle = je.UserGame.Game.Title,
                    Content = je.Content,
                    Rating = je.Rating,
                    SessionDurationMinutes = je.SessionDurationMinutes,
                    Tags = je.Tags,
                    CreatedAt = je.CreatedAt,
                    UpdatedAt = je.UpdatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                totalEntries = entries.Count,
                entries
            });
        }

        private int GetUserId()
        {
            return int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;
        }
    }
}

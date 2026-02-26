using GamingLibrary.Core.DTOs;
using GamingLibrary.Core.Interfaces;
using GamingLibrary.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GamingLibrary.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;
        private readonly ApplicationDbContext _context;

        public AuthController(ApplicationDbContext context, IAuthService authService, ILogger<AuthController> logger)
        {
            _context = context;
            _authService = authService;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
        {
            _logger.LogInformation("Registation Attempt for email: {Email}", request.Email);

            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "All fields are required" });

            if (request.Password.Length < 6)
                return BadRequest(new { message = "Password must be at least 6 characters" });

            var result = await _authService.RegisterAsync(request);

            if (result == null)
                return BadRequest(new { message = "Username or email already exists" });

            _logger.LogInformation("User registered successfully: {Username}", result.Username);

            return Ok(result);
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
        {
            _logger.LogInformation("Login attempt for email: {Email}", request.Email);

            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Email and password are required" });

            var result = await _authService.LoginAsync(request);

            if(result == null)
            {
                _logger.LogWarning("Failed login attempt for email: {Email}", request.Email);
                return Unauthorized(new { message = "Invalid email or password" });
            }

            _logger.LogInformation("User logged in successfully: {Username}", result.Username);
            return Ok(result);
        }

        [HttpDelete("delete-account")]
        [Authorize]
        public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (userId == 0)
            {
                return Unauthorized(new { message = "Invalid user token" });
            }

            // Verify the confirmation text
            if (request.Confirmation != "DELETE")
            {
                return BadRequest(new { message = "Invalid confirmation. Please type 'DELETE' to confirm." });
            }

            _logger.LogWarning("User {UserId} requested account deletion", userId);

            try
            {
                // Get the user with all related data
                var user = await _context.Users
                    .Include(u => u.PlatformConnections)
                    .Include(u => u.UserGames)
                        .ThenInclude(ug => ug.JournalEntries)
                    .FirstOrDefaultAsync(u => u.UserID == userId);

                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Log what will be deleted
                _logger.LogInformation(
                    "Deleting account for user {UserId} ({Username}): {GameCount} games, {JournalCount} journal entries, {ConnectionCount} platform connections",
                    userId,
                    user.Username,
                    user.UserGames.Count,
                    user.UserGames.Sum(ug => ug.JournalEntries.Count),
                    user.PlatformConnections.Count
                );

                // Delete the user (cascade delete will handle related records)
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                _logger.LogWarning("Account deleted successfully for user {UserId} ({Username})", userId, user.Username);

                return Ok(new { message = "Account deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account for user {UserId}", userId);
                return StatusCode(500, new { message = "An error occurred while deleting your account" });
            }
        }
    }
    public class DeleteAccountRequest
    {
        public string Confirmation { get; set; } = string.Empty;
    }
}

namespace GamingLibrary.Core.Entities
{
    public class User
    {
        public int UserID { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty ;
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public ICollection<PlatformConnection> PlatformConnections { get; set; } = new List<PlatformConnection>();
        public ICollection<UserGame> UserGames { get; set; } = new List<UserGame>();
    }
}

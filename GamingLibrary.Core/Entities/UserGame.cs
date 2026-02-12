namespace GamingLibrary.Core.Entities
{
    public class UserGame
    {
        public int UserGameID { get; set; }
        public int UserID { get; set; }
        public int GameID { get; set; }
        public string Platform { get; set; } = string.Empty;
        public string PlatformGameID { get; set; } = string.Empty;
        public DateTime? PurchaseDate { get; set; }
        public DateTime? LastPlayedAt { get; set; }
        public int PlaytimeMinutes { get; set; } = 0;
        public string? Status { get; set; }
        public DateTime AddedAt { get; set; }

        public User User { get; set; } = null!;
        public Game Game { get; set; } = null!;
        public ICollection<JournalEntry> JournalEntries { get; set; } = new List<JournalEntry>();
    }
}

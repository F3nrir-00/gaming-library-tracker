namespace GamingLibrary.Core.Entities
{
    public class JournalEntry
    {
        public int EntryID { get; set; }
        public int UserGameID { get; set; }
        public string Content { get; set; } = string.Empty;
        public int? Rating { get; set; }
        public int? SessionDurationMinutes { get; set; }
        public string? Tags { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public UserGame UserGame { get; set; } = null!;
    }
}

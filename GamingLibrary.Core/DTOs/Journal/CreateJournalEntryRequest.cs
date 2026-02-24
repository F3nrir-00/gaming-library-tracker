namespace GamingLibrary.Core.DTOs.Journal
{
    public class CreateJournalEntryRequest
    {
        public string Content { get; set; } = string.Empty;
        public int? Rating { get; set; }
        public int? SessionDurationMinutes { get; set; }
        public string? Tags { get; set; }
    }
}

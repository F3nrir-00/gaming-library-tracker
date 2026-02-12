namespace GamingLibrary.Core.Entities
{
    public class Game
    {
        public int GameID { get; set; }
        public string Title { get; set; } = string.Empty;
        public string NormalizedTitle { get; set; } = string.Empty;
        public string? Description {  get; set; }
        public string? CoverImageURL { get; set; }
        public DateTime? ReleaseDate {  get; set; }
        public string? Developer { get; set; }
        public string? Publisher { get; set; }
        public DateTime CreatedAt { get; set; }

        public ICollection<UserGame> UserGames { get; set; } = new List<UserGame>();
    }
}

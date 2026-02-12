using System.Text.Json.Serialization;

namespace GamingLibrary.Core.DTOs.IGDB
{
    public class IgdbGame
    {
        [JsonPropertyName("id")]
        public int ID { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("summary")]
        public string? Summary { get; set; }

        [JsonPropertyName("first_release_date")]
        public long? FirstReleaseDate { get; set; }

        [JsonPropertyName("cover")]
        public IgdbCover? Cover { get; set; }

        [JsonPropertyName("involved_companies")]
        public List<IgdbInvolvedCompany>? InvolvedCompanies { get; set; }

        [JsonPropertyName("genres")]
        public List<IgdbGenre>? Genres { get; set; }
    }

    public class IgdbCover
    {
        [JsonPropertyName("id")]
        public int ID { get; set; }

        [JsonPropertyName("url")]
        public string? Url { get; set; }
    }

    public class IgdbInvolvedCompany
    {
        [JsonPropertyName("id")]
        public int ID { get; set; }

        [JsonPropertyName("company")]
        public IgdbCompany? Company { get; set; }

        [JsonPropertyName("developer")]
        public bool IsDeveloper { get; set; }

        [JsonPropertyName("publisher")]
        public bool IsPublisher { get; set; }
    }

    public class IgdbCompany
    {
        [JsonPropertyName("id")]
        public int ID { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    public class IgdbGenre
    {
        [JsonPropertyName("id")]
        public int ID { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }
}

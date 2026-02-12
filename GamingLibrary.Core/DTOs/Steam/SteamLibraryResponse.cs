using System.Text.Json.Serialization;

namespace GamingLibrary.Core.DTOs.Steam
{
    public class SteamLibraryResponse
    {
        [JsonPropertyName("response")]
        public SteamResponseData Response { get; set; } = new();
    }

    public class SteamResponseData
    {
        [JsonPropertyName("game_count")]
        public int GameCount { get; set; }
        [JsonPropertyName("games")]
        public List<SteamGame> Games { get; set; } = new();
    }
}

using System.Text.Json.Serialization;

namespace GamingLibrary.Core.DTOs.Steam
{
    public class SteamGame
    {
        [JsonPropertyName("appid")]
        public int AppID { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("playtime_forever")]
        public int PlaytimeForever { get; set; }

        [JsonPropertyName("playtime_windows_forever")]
        public int? PlaytimeWindowsForever { get; set; }

        [JsonPropertyName("playtime_mac_forever")]
        public int? PlaytimeMacForever { get; set; }

        [JsonPropertyName("playtime_linux_forever")]
        public int? PlaytimeLinuxForever { get; set; }

        [JsonPropertyName("rtime_last_played")]
        public long? RtimeLastPlayed { get; set; }

        [JsonPropertyName("img_icon_url")]
        public string? ImgIconURL { get; set; }

        [JsonPropertyName("img_logo_url")]
        public string? ImgLogoURL { get; set; }
    }
}

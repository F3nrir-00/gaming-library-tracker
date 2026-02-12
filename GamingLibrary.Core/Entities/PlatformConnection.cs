namespace GamingLibrary.Core.Entities
{
    public class PlatformConnection
    {
        public int ConnectionID { get; set; }
        public int UserID { get; set; }
        public string Platform { get; set; } = string.Empty;
        public string PlatformUserId { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime ConnectedAt { get; set; }
        public DateTime? LastSyncedAt { get; set; }

        public User User { get; set; } = null!;
    }
}

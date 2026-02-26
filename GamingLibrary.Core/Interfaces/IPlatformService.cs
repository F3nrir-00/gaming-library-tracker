using GamingLibrary.Core.Entities;

namespace GamingLibrary.Core.Interfaces
{
    public interface IPlatformService
    {
        string PlatformName { get; }

        Task<int> SyncUserGamesAsync(int userID, string platformUserId);

        Task<List<UserGame>> GetUserGamesFromPlatformAsync(int userID, string platformUserId);
        Task<string> ResolveUsernameAsync(string username);
    }
}

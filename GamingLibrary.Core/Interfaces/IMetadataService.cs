using GamingLibrary.Core.DTOs.IGDB;
using GamingLibrary.Core.Entities;

namespace GamingLibrary.Core.Interfaces
{
    public interface IMetadataService
    {
        Task<Game> EnrichGameMetadataAsync(Game game);

        Task<IgdbGame?> SearchGameAsync(string title);
    }
}

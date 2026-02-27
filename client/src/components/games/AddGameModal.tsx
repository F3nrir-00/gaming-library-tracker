import { useState, useEffect } from 'react';
import { gameService } from '../../services/gameService';

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    platform: string;
    playtimeHours?: number;
    status?: string;
    igdbId?: number;
  }) => Promise<void>;
}

interface SearchResult {
  igdbId: number;
  title: string;
  coverImageUrl?: string;
  developer?: string;
  publisher?: string;
  releaseYear?: number;
}

export default function AddGameModal({ isOpen, onClose, onSubmit }: AddGameModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedGame, setSelectedGame] = useState<SearchResult | null>(null);
  
  const [platform, setPlatform] = useState('PC');
  const [playtimeHours, setPlaytimeHours] = useState('');
  const [status, setStatus] = useState('Not Started');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await gameService.searchGames(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectGame = (game: SearchResult) => {
    setSelectedGame(game);
    setSearchQuery(game.title);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit({
        title: selectedGame?.title || searchQuery.trim(),
        platform,
        playtimeHours: playtimeHours ? parseFloat(playtimeHours) : undefined,
        status: status || undefined,
        igdbId: selectedGame?.igdbId,
      });
      
      // Reset form
      setSearchQuery('');
      setSelectedGame(null);
      setSearchResults([]);
      setPlatform('PC');
      setPlaytimeHours('');
      setStatus('Not Started');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Game</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Search with Autocomplete */}
            <div className="mb-4 relative">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Game <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedGame(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Start typing game title..."
                  required
                  autoComplete="off"
                />
                {searching && (
                  <div className="absolute right-3 top-2.5">
                    <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((game) => (
                    <button
                      key={game.igdbId}
                      type="button"
                      onClick={() => handleSelectGame(game)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center space-x-3"
                    >
                      {game.coverImageUrl && (
                        <img
                          src={game.coverImageUrl}
                          alt={game.title}
                          className="w-10 h-14 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {game.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {game.developer && `${game.developer} • `}
                          {game.releaseYear}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Game Preview */}
              {selectedGame && (
                <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded-md flex items-center space-x-3">
                  {selectedGame.coverImageUrl && (
                    <img
                      src={selectedGame.coverImageUrl}
                      alt={selectedGame.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedGame.title}
                    </p>
                    <p className="text-xs text-gray-600">
                      {selectedGame.developer && `${selectedGame.developer} • `}
                      {selectedGame.releaseYear}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Platform */}
            <div className="mb-4">
              <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
                Platform <span className="text-red-500">*</span>
              </label>
              <select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PC">PC</option>
                <option value="Steam">Steam</option>
                <option value="PlayStation">PlayStation</option>
                <option value="PlayStation 5">PlayStation 5</option>
                <option value="PlayStation 4">PlayStation 4</option>
                <option value="Xbox">Xbox</option>
                <option value="Xbox Series X/S">Xbox Series X/S</option>
                <option value="Xbox One">Xbox One</option>
                <option value="Nintendo Switch">Nintendo Switch</option>
                <option value="Mobile">Mobile</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Playtime */}
            <div className="mb-4">
              <label htmlFor="playtime" className="block text-sm font-medium text-gray-700 mb-1">
                Playtime (hours)
              </label>
              <input
                type="number"
                id="playtime"
                value={playtimeHours}
                onChange={(e) => setPlaytimeHours(e.target.value)}
                min="0"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
            </div>

            {/* Status */}
            <div className="mb-4">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Abandoned">Abandoned</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                {loading ? 'Adding...' : 'Add Game'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
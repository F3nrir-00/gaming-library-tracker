import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import GameCard from '../components/games/GameCard';
import LibraryFilters from '../components/games/LibraryFilters';
import ConnectSteamModal from '../components/games/ConnectSteamModal';
import GameDetailModal from '../components/games/GameDetailModal';
import { gameService } from '../services/gameService';
import type { Game } from '../types';

export default function LibraryPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [sortBy, setSortBy] = useState('playtime');
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);

    const queryClient = useQueryClient();

    // Fetch platform connections
    const { data: connections } = useQuery({
        queryKey: ['platformConnections'],
        queryFn: gameService.getPlatformConnections,
    });

    const hasSteamConnection = connections?.some((c) => c.platform === 'Steam');

    // Fetch games library
    const { data: library, isLoading } = useQuery({
        queryKey: ['games', searchQuery, selectedPlatform, selectedStatus, sortBy],
        queryFn: () => {
            const sortOrder = sortBy === 'title' ? 'asc' : 'desc';

            return gameService.getLibrary({
                search: searchQuery || undefined,
                platform: selectedPlatform || undefined,
                status: selectedStatus || undefined,
                sortBy,
                sortOrder,
            });
        },
    });

    // Connect Steam mutation
    const connectSteamMutation = useMutation({
        mutationFn: gameService.connectSteam,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platformConnections'] });
        },
    });

    // Sync Steam mutation
    const syncSteamMutation = useMutation({
        mutationFn: gameService.syncSteam,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] });
            queryClient.invalidateQueries({ queryKey: ['platformConnections'] });
        },
    });

    const handleConnectSteam = async (steamId: string) => {
        await connectSteamMutation.mutateAsync(steamId);
    };

    const handleSyncSteam = async () => {
        await syncSteamMutation.mutateAsync();
    };

    return (
        <Layout>
            <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Game Library</h1>
                        {library && (
                            <p className="text-gray-600 mt-1">
                                {library.totalGames} games • {library.totalPlaytimeHours} hours played
                            </p>
                        )}
                    </div>

                    <div className="flex space-x-3">
                        {!hasSteamConnection ? (
                            <button
                                onClick={() => setShowConnectModal(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-.02 18.923c-3.816 0-6.904-3.093-6.904-6.904 0-.503.056-.993.156-1.465l3.764 1.556a2.028 2.028 0 001.932 2.66c1.123 0 2.035-.913 2.035-2.035v-.075l2.916-2.075c2.075.047 3.741 1.735 3.741 3.8 0 2.098-1.706 3.804-3.804 3.804a3.777 3.777 0 01-3.836-3.266z" />
                                </svg>
                                Connect Steam
                            </button>
                        ) : (
                            <button
                                onClick={handleSyncSteam}
                                disabled={syncSteamMutation.isPending}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 flex items-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {syncSteamMutation.isPending ? 'Syncing...' : 'Sync Steam Library'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <LibraryFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedPlatform={selectedPlatform}
                    onPlatformChange={setSelectedPlatform}
                    selectedStatus={selectedStatus}
                    onStatusChange={setSelectedStatus}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                />

                {/* Games Grid - Changed this section */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : library && library.games.length > 0 ? (
                    <div className="relative">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {library.games.map((game) => (
                                <GameCard
                                    key={game.userGameID}
                                    game={game}
                                    onClick={() => setSelectedGame(game)}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No games found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {!hasSteamConnection
                                ? 'Connect your Steam account to get started.'
                                : 'Sync your Steam library or adjust your filters.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Connect Steam Modal */}
            <ConnectSteamModal
                isOpen={showConnectModal}
                onClose={() => setShowConnectModal(false)}
                onConnect={handleConnectSteam}
            />

            {/* Game Detail Modal */}
            <GameDetailModal
                key={selectedGame?.userGameID}
                game={selectedGame}
                isOpen={selectedGame !== null}
                onClose={() => setSelectedGame(null)}
            />
        </Layout>
    );
}
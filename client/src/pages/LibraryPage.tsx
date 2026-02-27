import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import GameCard from '../components/games/GameCard';
import LibraryFilters from '../components/games/LibraryFilters';
import GameDetailModal from '../components/games/GameDetailModal';
import { gameService } from '../services/gameService';
import type { Game } from '../types';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import AddGameModal from '../components/games/AddGameModal';

export default function LibraryPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [sortBy, setSortBy] = useState('playtime');
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [showAddGameModal, setShowAddGameModal] = useState(false);

    const queryClient = useQueryClient();

    useEffect(() => {
        const steamSuccess = searchParams.get('steamSuccess');
        const steamError = searchParams.get('steamError');

        if (steamSuccess) {
            // Refresh connections and games
            queryClient.invalidateQueries({ queryKey: ['platformConnections'] });
            queryClient.invalidateQueries({ queryKey: ['games'] });
            setSearchParams({});
        }

        if (steamError) {
            alert(`Steam connection failed: ${steamError}`);
            setSearchParams({});
        }
    }, [searchParams]);

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

    // Sync Steam mutation
    const syncSteamMutation = useMutation({
        mutationFn: gameService.syncSteam,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] });
            queryClient.invalidateQueries({ queryKey: ['platformConnections'] });
        },
    });

    const handleSyncSteam = async () => {
        await syncSteamMutation.mutateAsync();
    };

    const addGameMutation = useMutation({
        mutationFn: gameService.addGameManually,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] });
            setShowAddGameModal(false);
        },
    });

    const handleAddGame = async (data: any) => {
        await addGameMutation.mutateAsync(data);
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
                        <button
                            onClick={() => setShowAddGameModal(true)}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Game
                        </button>
                        {!hasSteamConnection ? (
                            <button
                                onClick={async () => {
                                    try {
                                        console.log('Token before request:', localStorage.getItem('token'));
                                        const response = await api.get('/auth/steam/login');
                                        console.log('Response:', response);
                                        if (response.data.redirectUrl) {
                                            window.location.href = response.data.redirectUrl;
                                        }
                                    } catch (error: any) {
                                        console.error('Steam login error:', error);
                                        console.error('Error response:', error.response);
                                        alert(error.response?.data?.message || 'Failed to connect to Steam');
                                    }
                                }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M.329 10.333A8.01 8.01 0 0 0 7.99 16C12.414 16 16 12.418 16 8s-3.586-8-8.009-8A8.006 8.006 0 0 0 0 7.468l.003.006 4.304 1.769A2.2 2.2 0 0 1 5.62 8.88l1.96-2.844-.001-.04a3.046 3.046 0 0 1 3.042-3.043 3.046 3.046 0 0 1 3.042 3.043 3.047 3.047 0 0 1-3.111 3.044l-2.804 2a2.223 2.223 0 0 1-3.075 2.11 2.22 2.22 0 0 1-1.312-1.568L.33 10.333Z" />
                                    <path d="M4.868 12.683a1.715 1.715 0 0 0 1.318-3.165 1.7 1.7 0 0 0-1.263-.02l1.023.424a1.261 1.261 0 1 1-.97 2.33l-.99-.41a1.7 1.7 0 0 0 .882.84Zm3.726-6.687a2.03 2.03 0 0 0 2.027 2.029 2.03 2.03 0 0 0 2.027-2.029 2.03 2.03 0 0 0-2.027-2.027 2.03 2.03 0 0 0-2.027 2.027m2.03-1.527a1.524 1.524 0 1 1-.002 3.048 1.524 1.524 0 0 1 .002-3.048" />
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

            {/* Game Detail Modal */}
            <GameDetailModal
                key={selectedGame?.userGameID}
                game={selectedGame}
                isOpen={selectedGame !== null}
                onClose={() => setSelectedGame(null)}
            />

            <AddGameModal
                isOpen={showAddGameModal}
                onClose={() => setShowAddGameModal(false)}
                onSubmit={handleAddGame}
            />
        </Layout >
    );
}
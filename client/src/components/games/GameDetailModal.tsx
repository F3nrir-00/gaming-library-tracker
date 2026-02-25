import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Game } from '../../types';
import { gameService } from '../../services/gameService';

interface GameDetailModalProps {
    game: Game | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function GameDetailModal({ game, isOpen, onClose }: GameDetailModalProps) {
    const [selectedStatus, setSelectedStatus] = useState(game?.status || '');
    const queryClient = useQueryClient();


    const updateStatusMutation = useMutation({
        mutationFn: (status: string) => gameService.updateStatus(game!.userGameID, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] });
        },
    });

    if (!isOpen || !game) return null;

    const handleStatusUpdate = async (status: string) => {
        setSelectedStatus(status);
        await updateStatusMutation.mutateAsync(status);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'bg-green-600 hover:bg-green-700';
            case 'in progress':
                return 'bg-blue-600 hover:bg-blue-700';
            case 'not started':
                return 'bg-gray-600 hover:bg-gray-700';
            case 'abandoned':
                return 'bg-red-600 hover:bg-red-700';
            default:
                return 'bg-gray-600 hover:bg-gray-700';
        }
    };

    const statuses = ['Not Started', 'In Progress', 'Completed', 'Abandoned'];

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header with close button */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 truncate pr-4">
                        {game.gameTitle}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Cover Image */}
                    <div className="mb-6">
                        <div className="aspect-[1365/440] bg-gray-200 rounded-lg overflow-hidden">
                            {game.coverImageURL ? (
                                <img
                                    src={game.coverImageURL.replace('/header.jpg', '/library_hero.jpg')}
                                    alt={game.gameTitle}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        // Fallback to header if library_hero doesn't exist
                                        const target = e.target as HTMLImageElement;
                                        if (!target.src.includes('/header.jpg')) {
                                            target.src = game.coverImageURL!;
                                        } else {
                                            target.src = `https://placehold.co/1365x440?text=${game.gameTitle}`;
                                        }
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    {game.gameTitle}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Game Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Left Column - Stats */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Platform</h3>
                                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                                    {game.platform}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Playtime</h3>
                                <p className="text-2xl font-bold text-gray-900">
                                    {game.playtimeHours} hours
                                </p>
                                <p className="text-sm text-gray-600">
                                    {game.playtimeMinutes} minutes total
                                </p>
                            </div>

                            {game.lastPlayedAt && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Last Played</h3>
                                    <p className="text-gray-900">
                                        {new Date(game.lastPlayedAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Added to Library</h3>
                                <p className="text-gray-900">
                                    {new Date(game.addedAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* Right Column - Details */}
                        <div className="space-y-4">
                            {game.developer && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Developer</h3>
                                    <p className="text-gray-900">{game.developer}</p>
                                </div>
                            )}

                            {game.publisher && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Publisher</h3>
                                    <p className="text-gray-900">{game.publisher}</p>
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Platform Game ID</h3>
                                <p className="text-gray-900 font-mono text-sm">{game.platformGameID}</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Update Section */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {statuses.map((status) => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusUpdate(status)}
                                    disabled={updateStatusMutation.isPending}
                                    className={`px-4 py-3 rounded-md text-white font-medium transition-colors ${(selectedStatus || game.status) === status
                                        ? getStatusColor(status)
                                        : 'bg-gray-300 hover:bg-gray-400'
                                        } disabled:opacity-50`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                        {updateStatusMutation.isPending && (
                            <p className="text-sm text-gray-600 mt-2">Updating status...</p>
                        )}
                    </div>

                    {/* Journal Section - Placeholder */}
                    <div className="border-t border-gray-200 pt-6 mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Journal Entries</h3>
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm">
                                Add Entry
                            </button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-6 text-center">
                            <p className="text-gray-600 text-sm">
                                Journal entries will appear here. (Coming next!)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
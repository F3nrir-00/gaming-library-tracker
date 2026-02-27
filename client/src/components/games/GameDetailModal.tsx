import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import type { Game } from '../../types';
import { gameService } from '../../services/gameService';
import { journalService } from '../../services/journalService';
import JournalEntryForm from '../journal/JournalEntryForm';
import JournalEntryCard from '../journal/JournalEntryCard';

interface GameDetailModalProps {
    game: Game | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function GameDetailModal({ game, isOpen, onClose }: GameDetailModalProps) {
    const [selectedStatus, setSelectedStatus] = useState(game?.status || '');
    const [showJournalForm, setShowJournalForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<number | null>(null);
    const queryClient = useQueryClient();


    useEffect(() => {
        if (game) {
            console.log('Game data:', {
                title: game.gameTitle,
                coverImageUrl: game.coverImageURL,
                bannerImageUrl: game.bannerImageUrl,
                steamAppId: game.platformGameID
            });
        }
    }, [game]);

    const updateStatusMutation = useMutation({
        mutationFn: (status: string) => gameService.updateStatus(game!.userGameID, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] });
        },
    });

    const { data: journalData } = useQuery({
        queryKey: ['journal', game?.userGameID],
        queryFn: () => journalService.getEntriesForGame(game!.userGameID),
        enabled: !!game,
    });

    const createEntryMutation = useMutation({
        mutationFn: (data: any) => journalService.createEntry(game!.userGameID, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journal', game?.userGameID] });
            setShowJournalForm(false);
        },
    });

    const updateEntryMutation = useMutation({
        mutationFn: ({ entryId, data }: { entryId: number; data: any }) =>
            journalService.updateEntry(entryId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journal', game?.userGameID] });
            setEditingEntry(null);
            setShowJournalForm(false);
        },
    });

    const deleteEntryMutation = useMutation({
        mutationFn: (entryId: number) => journalService.deleteEntry(entryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journal', game?.userGameID] });
        },
    });

    const handleCreateEntry = async (data: any) => {
        await createEntryMutation.mutateAsync(data);
    };

    const handleUpdateEntry = async (data: any) => {
        if (editingEntry) {
            await updateEntryMutation.mutateAsync({ entryId: editingEntry, data });
        }
    };

    const handleDeleteEntry = async (entryId: number) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            await deleteEntryMutation.mutateAsync(entryId);
        }
    };

    const handleEditEntry = (entryId: number) => {
        setEditingEntry(entryId);
        setShowJournalForm(true);
    };

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

    const deleteGameMutation = useMutation({
        mutationFn: (userGameId: number) => gameService.deleteGame(userGameId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] });
            onClose(); // Close modal after deletion
        },
    });

    const handleDeleteGame = () => {
        if (!game) return;

        const confirmMessage = `Are you sure you want to remove "${game.gameTitle}" from your library?\n\nThis will permanently delete:\n- The game from your library\n- All journal entries for this game\n\nThis action cannot be undone.`;

        if (window.confirm(confirmMessage)) {
            deleteGameMutation.mutate(game.userGameID);
        }
    };

    const statuses = ['Not Started', 'In Progress', 'Completed', 'Abandoned'];

    if (!isOpen || !game) return null;

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
                        <div className="aspect-[1280/720] bg-gray-900 rounded-lg overflow-hidden">
                            {game.bannerImageUrl ? (
                                <img
                                    src={game.bannerImageUrl.replace('/t_screenshot_huge', '/t_original')}
                                    alt={game.gameTitle}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        // Fallback to header if library_hero doesn't exist
                                        const target = e.target as HTMLImageElement;
                                        if (!target.src.includes('/header.jpg')) {
                                            target.src = game.coverImageURL!;
                                        } else {
                                            target.src = `https://placehold.co/1280x720?text=${game.gameTitle}`;
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

                    {/* Journal Section */}
                    <div className="border-t border-gray-200 pt-6 mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Journal Entries</h3>
                                {journalData && journalData.totalEntries > 0 && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {journalData.totalEntries} {journalData.totalEntries === 1 ? 'entry' : 'entries'}
                                        {journalData.averageRating > 0 && (
                                            <span className="ml-2">
                                                • Average rating: <span className="text-yellow-500">★</span> {journalData.averageRating.toFixed(1)}/10
                                            </span>
                                        )}
                                    </p>
                                )}
                            </div>
                            {!showJournalForm && (
                                <button
                                    onClick={() => {
                                        setEditingEntry(null);
                                        setShowJournalForm(true);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                                >
                                    Add Entry
                                </button>
                            )}
                        </div>

                        {/* Journal Form */}
                        {showJournalForm && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-700 mb-4">
                                    {editingEntry ? 'Edit Entry' : 'New Entry'}
                                </h4>
                                <JournalEntryForm
                                    onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry}
                                    onCancel={() => {
                                        setShowJournalForm(false);
                                        setEditingEntry(null);
                                    }}
                                    initialData={
                                        editingEntry
                                            ? journalData?.entries.find((e) => e.entryID === editingEntry)
                                            : undefined
                                    }
                                    isLoading={createEntryMutation.isPending || updateEntryMutation.isPending}
                                />
                            </div>
                        )}

                        {/* Journal Entries List */}
                        {journalData && journalData.entries.length > 0 ? (
                            <div className="space-y-4">
                                {journalData.entries.map((entry) => (
                                    <JournalEntryCard
                                        key={entry.entryID}
                                        entry={entry}
                                        onEdit={() => handleEditEntry(entry.entryID)}
                                        onDelete={() => handleDeleteEntry(entry.entryID)}
                                    />
                                ))}
                            </div>
                        ) : !showJournalForm ? (
                            <div className="bg-gray-50 rounded-lg p-6 text-center">
                                <p className="text-gray-600 text-sm">
                                    No journal entries yet. Click "Add Entry" to record your thoughts!
                                </p>
                            </div>
                        ) : null}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                        <button
                            onClick={handleDeleteGame}
                            disabled={deleteGameMutation.isPending}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 flex items-center"
                        >
                            {deleteGameMutation.isPending ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Game
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

}
import { useEffect, useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Game } from '../../types';
import { gameService } from '../../services/gameService';
import { createPortal } from 'react-dom';

interface GameCardProps {
    game: Game;
    onClick?: () => void;
}

export default function GameCard({ game, onClick }: GameCardProps) {
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; openUpward: boolean } | null>(null);
    const [isMeasuring, setIsMeasuring] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();


    // Check if we should open upward when menu opens
    useEffect(() => {
        if (showStatusMenu && buttonRef.current && isMeasuring && menuRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const menuHeight = menuRef.current?.offsetHeight;
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUpward = spaceBelow < menuHeight + 8;

            setMenuPosition({
                top: openUpward ? rect.top - menuHeight - 4 : rect.bottom + 4,
                left: rect.left,
                openUpward
            });
            setIsMeasuring(false);
        }
    }, [showStatusMenu, isMeasuring]);

    useEffect(() => {
        const handleScroll = () => setShowStatusMenu(false);
        if (showStatusMenu) {
            window.addEventListener('scroll', handleScroll, true);
            return () => window.removeEventListener('scroll', handleScroll, true);
        }
    }, [showStatusMenu]);

    const updateStatusMutation = useMutation({
        mutationFn: (status: string) => gameService.updateStatus(game.userGameID, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] });
            setShowStatusMenu(false);
            setMenuPosition(null);
        },
    });

    const getStatusColor = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'in progress':
                return 'bg-blue-100 text-blue-800';
            case 'not started':
                return 'bg-gray-100 text-gray-800';
            case 'abandoned':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const statuses = ['Not Started', 'In Progress', 'Completed', 'Abandoned'];

    const handleStatusClick = (e: React.MouseEvent, status: string) => {
        e.stopPropagation(); // Prevent card click from firing
        updateStatusMutation.mutate(status);
    };

    const handleMenuToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!showStatusMenu) {
            setShowStatusMenu(true);
            setIsMeasuring(true);
        } else {
            setShowStatusMenu(false);
            setMenuPosition(null);
        }
    };

    const handleClose = () => {
        setShowStatusMenu(false);
        setMenuPosition(null);
    };

    const dropdownMenu = showStatusMenu && (
        <>
            {/* Backdrop - only show after measurement */}
            {menuPosition && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleClose();
                    }}
                />
            )}

            {/* Menu - render off-screen during measurement, then in final position */}
            <div
                ref={menuRef}
                className="fixed w-40 bg-white rounded-md shadow-lg z-50 border border-gray-200"
                style={
                    menuPosition
                        ? {
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`,
                        }
                        : {
                            // Off-screen during measurement
                            top: '-9999px',
                            left: '-9999px',
                            visibility: 'hidden',
                        }
                }
            >
                {statuses.map((status) => (
                    <button
                        key={status}
                        onClick={(e) => handleStatusClick(e, status)}
                        disabled={updateStatusMutation.isPending}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md disabled:opacity-50 ${game.status === status ? 'bg-gray-50 font-medium' : ''
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>
        </>
    );

    return (
        <div onClick={onClick} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer relative">
            <div className="aspect-[264/352] bg-gray-200 overflow-hidden rounded-t-lg">
                {game.coverImageURL ? (
                    <img
                        src={game.coverImageURL}
                        alt={game.gameTitle}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://placehold.co/264x374?text=${game.gameTitle}`;
                        }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        {game.gameTitle}
                    </div>
                )}
            </div>

            <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate mb-2">
                    {game.gameTitle}
                </h3>

                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {game.playtimeHours}h
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {game.platform}
                    </span>
                </div>

                {/* Status with Dropdown */}
                <div className="relative">
                    {game.status ? (
                        <button
                            ref={buttonRef}
                            onClick={handleMenuToggle}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(game.status)} hover:opacity-80 transition-opacity`}
                        >
                            {game.status}
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            ref={buttonRef}
                            onClick={handleMenuToggle}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                        >
                            Set Status
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}

                    {game.developer && (
                        <p className="text-xs text-gray-500 mt-2 truncate">
                            {game.developer}
                        </p>
                    )}
                </div>
            </div>

            {/* Render dropdown menu via portal */}
            {dropdownMenu && createPortal(dropdownMenu, document.body)}
        </div>
    );
}
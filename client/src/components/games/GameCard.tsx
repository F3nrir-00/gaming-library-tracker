import type { Game } from '../../types';

interface GameCardProps {
    game: Game;
    onClick?: () => void;
}

export default function GameCard({ game, onClick }: GameCardProps) {
    const getStatusColor = (status?: string) => {
        switch(status?.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'in progress':
                return 'bg-blue-100 text-blue-800';
            case 'not started':
                return 'bg-gray-100 text-yellow-800';
            case 'abandoned':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div onClick={onClick} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
            <div className="aspect-[16/9] bg-gray-200 overflow-hidden">
                {game.coverImageURL ? (
                    <img
                        src={game.coverImageURL}
                        alt={game.gameTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://placehold.co/460x215?text=${game.gameTitle}`;
                        }}/>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                    </div>
                )}
            </div>
            
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate mb-2">{game.gameTitle}</h3>

                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {game.playtimeHours} hrs
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                        {game.platform}
                    </span>
                </div>

                {game.status && (
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(game.status)}`}>
                        {game.status}
                    </span>
                )}

                {game.developer && (
                    <p className="text-xs text-gray-500 mt-2 truncate">{game.developer}</p>
                )}
            </div>
        </div>
    );
}
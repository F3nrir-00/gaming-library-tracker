import { useState } from 'react';

interface ConnectSteamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect: (steamID: string) => Promise<void>;
}

export default function ConnectSteamModal({ isOpen, onClose, onConnect }: ConnectSteamModalProps) {
    const [steamID, setSteamID] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await onConnect(steamID);
            setSteamID('');
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to connect Steam account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Connect Steam Account</h3>
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

                        <div className="mb-4">
                            <label htmlFor="steamUsername" className="block text-sm font-medium text-gray-700 mb-2">
                                Steam Username
                            </label>
                            <input
                                type="text"
                                id="steamUsername"
                                value={steamID}
                                onChange={(e) => setSteamID(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="your-steam-username"
                                required
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Enter your Steam username (e.g., "johndoe"). You can find this in your Steam profile URL:
                                steamcommunity.com/id/<strong>your-username</strong>
                            </p>
                        </div>

                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-800">
                                ⚠️ Your Steam profile must be set to <strong>Public</strong> for library sync to work.
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
                            >
                                {loading ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
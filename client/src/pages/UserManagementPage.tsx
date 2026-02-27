import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { gameService } from '../services/gameService';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

export default function UserManagementPage() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch platform connections
  const { data: connections } = useQuery({
    queryKey: ['platformConnections'],
    queryFn: gameService.getPlatformConnections,
  });

  // Disconnect platform mutation
  const disconnectMutation = useMutation({
    mutationFn: (platform: string) => gameService.disconnectPlatform(platform),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformConnections'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (confirmation: string) => authService.deleteAccount(confirmation),
    onSuccess: () => {
      logout();
      navigate('/login');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to delete account');
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

  const handleDisconnect = async (platform: string) => {
    if (window.confirm(`Are you sure you want to disconnect your ${platform} account? This will not delete your games, but you won't be able to sync new ones until you reconnect.`)) {
      await disconnectMutation.mutateAsync(platform);
    }
  };

  const handleSync = async () => {
    await syncSteamMutation.mutateAsync();
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText === 'DELETE') {
      deleteAccountMutation.mutate(deleteConfirmText);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and connected platforms</p>
        </div>

        {/* User Information */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <p className="mt-1 text-gray-900">{user?.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-gray-900">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Connected Platforms */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Connected Platforms</h2>
          </div>
          <div className="px-6 py-4">
            {connections && connections.length > 0 ? (
              <div className="space-y-4">
                {connections.map((connection) => (
                  <div
                    key={connection.connectionID}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M.329 10.333A8.01 8.01 0 0 0 7.99 16C12.414 16 16 12.418 16 8s-3.586-8-8.009-8A8.006 8.006 0 0 0 0 7.468l.003.006 4.304 1.769A2.2 2.2 0 0 1 5.62 8.88l1.96-2.844-.001-.04a3.046 3.046 0 0 1 3.042-3.043 3.046 3.046 0 0 1 3.042 3.043 3.047 3.047 0 0 1-3.111 3.044l-2.804 2a2.223 2.223 0 0 1-3.075 2.11 2.22 2.22 0 0 1-1.312-1.568L.33 10.333Z" />
                          <path d="M4.868 12.683a1.715 1.715 0 0 0 1.318-3.165 1.7 1.7 0 0 0-1.263-.02l1.023.424a1.261 1.261 0 1 1-.97 2.33l-.99-.41a1.7 1.7 0 0 0 .882.84Zm3.726-6.687a2.03 2.03 0 0 0 2.027 2.029 2.03 2.03 0 0 0 2.027-2.029 2.03 2.03 0 0 0-2.027-2.027 2.03 2.03 0 0 0-2.027 2.027m2.03-1.527a1.524 1.524 0 1 1-.002 3.048 1.524 1.524 0 0 1 .002-3.048" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{connection.platform}</h3>
                        <p className="text-sm text-gray-600">
                          Connected{' '}
                          {new Date(connection.connectedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        {connection.lastSyncedAt && (
                          <p className="text-xs text-gray-500">
                            Last synced:{' '}
                            {new Date(connection.lastSyncedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {connection.platform === 'Steam' && (
                        <button
                          onClick={handleSync}
                          disabled={syncSteamMutation.isPending}
                          className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 disabled:opacity-50"
                        >
                          {syncSteamMutation.isPending ? 'Syncing...' : 'Sync Now'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDisconnect(connection.platform)}
                        disabled={disconnectMutation.isPending}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No platforms connected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Go to the Library page to connect your Steam account.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow border-2 border-red-200">
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
          </div>
          <div className="px-6 py-4">
            {!showDeleteConfirm ? (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Delete Account</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Once you delete your account, there is no going back. This will permanently delete
                  your account, all your games, journal entries, and statistics.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold text-red-900 mb-2">
                  Are you absolutely sure?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  This action cannot be undone. This will permanently delete your account and remove
                  all your data from our servers.
                </p>
                <div className="mb-4">
                  <label
                    htmlFor="delete-confirm"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Please type <span className="font-mono font-bold">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="DELETE"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || deleteAccountMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                  >
                    {deleteAccountMutation.isPending
                      ? 'Deleting account...'
                      : 'I understand, delete my account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
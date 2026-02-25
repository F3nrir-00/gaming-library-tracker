import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { gameService } from '../services/gameService';

export default function StatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['gameStats'],
    queryFn: gameService.getStats,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">No statistics available yet.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gaming Statistics</h1>
          <p className="text-gray-600 mt-1">Your gaming journey at a glance</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Games */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <svg
                  className="w-8 h-8 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Games</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalGames}</p>
              </div>
            </div>
          </div>

          {/* Total Playtime */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Playtime</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalPlaytimeHours.toFixed(0)}h
                </p>
              </div>
            </div>
          </div>

          {/* Most Played */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg
                  className="w-8 h-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Most Played</p>
                {stats.mostPlayedGame ? (
                  <div>
                    <p className="text-lg font-bold text-nowrap text-gray-900 max-w-[200px]">
                      {stats.mostPlayedGame.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {stats.mostPlayedGame.playtimeHours}h
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No games played yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Games by Platform */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Games by Platform</h2>
          {stats.gamesByPlatform.length > 0 ? (
            <div className="space-y-6">
              {stats.gamesByPlatform.map((platform) => (
                <div key={platform.platform}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <span className="text-lg font-semibold text-gray-900">
                        {platform.platform}
                      </span>
                      <span className="ml-3 text-sm text-gray-600">
                        {platform.count} {platform.count === 1 ? 'game' : 'games'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {platform.playtimeHours}h
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${(platform.count / stats.totalGames) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>
                      {((platform.count / stats.totalGames) * 100).toFixed(0)}% of library
                    </span>
                    <span>
                      {((platform.playtimeHours / stats.totalPlaytimeHours) * 100).toFixed(0)}% of
                      playtime
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">
              No games in your library yet. Connect your Steam account to get started!
            </p>
          )}
        </div>

        {/* Playtime Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Playtime Distribution</h2>
          {stats.totalPlaytimeHours > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stats.gamesByPlatform.map((platform) => (
                <div key={platform.platform} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{platform.platform}</span>
                    <span className="text-sm text-gray-600">{platform.playtimeHours}h</span>
                  </div>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div className="w-full">
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                          <div
                            style={{
                              width: `${
                                (platform.playtimeHours / stats.totalPlaytimeHours) * 100
                              }%`,
                            }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 to-purple-600"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 text-right">
                      {((platform.playtimeHours / stats.totalPlaytimeHours) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">
              Start playing games to see your playtime distribution!
            </p>
          )}
        </div>

        {/* Fun Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <h3 className="text-sm font-medium opacity-90">Average Playtime per Game</h3>
            <p className="text-3xl font-bold mt-2">
              {stats.totalGames > 0
                ? (stats.totalPlaytimeHours / stats.totalGames).toFixed(1)
                : 0}
              h
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-lg shadow p-6 text-white">
            <h3 className="text-sm font-medium opacity-90">Days Spent Gaming</h3>
            <p className="text-3xl font-bold mt-2">
              {(stats.totalPlaytimeHours / 24).toFixed(1)}
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg shadow p-6 text-white">
            <h3 className="text-sm font-medium opacity-90">Platforms Used</h3>
            <p className="text-3xl font-bold mt-2">{stats.gamesByPlatform.length}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
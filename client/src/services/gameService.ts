import api from './api';
import type { Game, GameStats, PlatformConnection } from '../types';

export const gameService = {
    async getLibrary(params?: {
        platform?: string;
        status?: string;
        search?: string;
        sortBy?: string;
        sortOrder?: string;
    }): Promise<{ totalGames: number; totalPlaytimeHours: number; games: Game[] }> {
        const response = await api.get('/games/library', { params });
        return response.data;
    },

    async getGame(userGameID: number): Promise<Game> {
        const response = await api.get(`/games/library/${userGameID}`);
        return response.data;
    },

    async getStats(): Promise<GameStats> {
        const response = await api.get('/games/stats');
        return response.data;
    },

    async updateStatus(userGameID: number, status: string): Promise<void> {
        await api.put(`/games/library/${userGameID}/status`, { status });
    },

    async getPlatformConnections(): Promise<PlatformConnection[]> {
        const response = await api.get('/platform/connections');
        return response.data;
    },

    async connectSteam(username: string): Promise<void> {
        await api.post('/platform/steam/connect-username', { username });
    },

    async syncSteam(): Promise<{gamesSynced: number}> {
        const response = await api.post('/platform/steam/sync');
        return response.data;
    },

    async disconnectPlatform(platform: string): Promise<void> {
        await api.delete(`/platform/${platform}`);
    },
};
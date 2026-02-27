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

    async syncSteam(): Promise<{ gamesSynced: number }> {
        const response = await api.post('/platform/steam/sync');
        return response.data;
    },

    async disconnectPlatform(platform: string): Promise<void> {
        await api.delete(`/platform/${platform}`);
    },

    async addGameManually(data: {
        title: string;
        platform: string;
        playtimeHours?: number;
        status?: string;
        igdbId?: number;
    }): Promise<void> {
        await api.post('/games/library/manual', data);
    },

    async deleteGame(userGameId: number): Promise<void> {
        await api.delete(`/games/library/${userGameId}`);
    },

    async searchGames(query: string): Promise<Array<{
        igdbId: number;
        title: string;
        coverImageUrl?: string;
        developer?: string;
        publisher?: string;
        releaseYear?: number;
    }>> {
        if (query.length < 2) return [];
        const response = await api.get('/games/search', { params: { query } });
        return response.data;
    },
};
// Auth types //
export interface User {
    userID: number;
    username: string;
    email: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    userID: number;
    username: string;
    email: string;
    token: string;
}

// Game Types //
export interface Game {
    userGameID: number;
    platform: string;
    platformGameID: string;
    gameTitle: string;
    coverImageURL?: string;
    bannerImageUrl?: string;
    developer?: string;
    publisher?: string;
    playtimeMinutes: number;
    playtimeHours: number;
    lastPlayedAt?: string;
    status?: string;
    addedAt: string;
}

export interface GameStats {
    totalGames: number;
    totalPlaytimeHours: number;
    gamesByPlatform: Array<{
        platform: string;
        count: number;
        playtimeHours: number;
    }>;
    mostPlayedGame?: {
        title: string;
        playtimeHours: number;
    };
}

// Journal Types //
export interface JournalEntry {
    entryID: number;
    userGameID: number;
    gameTitle: string;
    content: string;
    rating?: number;
    sessionDurationMinutes?: number;
    tags?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateJournalEntryRequest {
    content: string;
    rating?: number;
    sessionDurationMinutes?: number;
    tags?: string;
}

// Platform Types //
export interface PlatformConnection {
    connectionID: number;
    platform: string;
    platformUserID: string;
    connectedAt: string;
    lastSyncedAt?: string;
}
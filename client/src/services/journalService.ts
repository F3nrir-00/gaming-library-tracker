import api from './api';
import type { JournalEntry, CreateJournalEntryRequest } from '../types';

export const journalService = {
  // Get all journal entries for a specific game
  async getEntriesForGame(userGameId: number): Promise<{
    userGameId: number;
    gameTitle: string;
    totalEntries: number;
    averageRating: number;
    entries: JournalEntry[];
  }> {
    const response = await api.get(`/journal/game/${userGameId}`);
    return response.data;
  },

  // Get a specific journal entry
  async getEntry(entryId: number): Promise<JournalEntry> {
    const response = await api.get(`/journal/${entryId}`);
    return response.data;
  },

  // Create a new journal entry
  async createEntry(userGameId: number, data: CreateJournalEntryRequest): Promise<JournalEntry> {
    const response = await api.post(`/journal/game/${userGameId}`, data);
    return response.data;
  },

  // Update an existing journal entry
  async updateEntry(entryId: number, data: Partial<CreateJournalEntryRequest>): Promise<JournalEntry> {
    const response = await api.put(`/journal/${entryId}`, data);
    return response.data;
  },

  // Delete a journal entry
  async deleteEntry(entryId: number): Promise<void> {
    await api.delete(`/journal/${entryId}`);
  },

  // Get all journal entries for the current user (across all games)
  async getMyEntries(params?: {
    tags?: string;
    minRating?: number;
  }): Promise<{
    totalEntries: number;
    entries: JournalEntry[];
  }> {
    const response = await api.get('/journal/my-entries', { params });
    return response.data;
  },
};
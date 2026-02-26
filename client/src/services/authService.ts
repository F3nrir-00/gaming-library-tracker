import api from './api';
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types';

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify({
        userId: response.data.userID,
        username: response.data.username,
        email: response.data.email,
      }));
    }
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify({
        userId: response.data.userID,
        username: response.data.username,
        email: response.data.email,
      }));
    }
    return response.data;
  },

  async deleteAccount(confirmation: string): Promise<void> {
    await api.delete('/auth/delete-account', {
      data: { confirmation }
    });
    this.logout();
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser(): { userID: number; username: string; email: string } | null {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },
};
import api from './client';
import type { User } from '../types';

export async function register(email: string, username: string, password: string): Promise<User> {
  const { data } = await api.post<User>('/auth/register', { email, username, password });
  return data;
}

export async function login(email: string, password: string): Promise<string> {
  const { data } = await api.post<{ access_token: string }>('/auth/login', { email, password });
  localStorage.setItem('token', data.access_token);
  return data.access_token;
}

export function logout() {
  localStorage.removeItem('token');
}

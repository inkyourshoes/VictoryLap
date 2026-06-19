import api from './client';
import type { FeedItem } from '../types';

export async function getFeed(): Promise<FeedItem[]> {
  const { data } = await api.get<FeedItem[]>('/feed/');
  return data;
}

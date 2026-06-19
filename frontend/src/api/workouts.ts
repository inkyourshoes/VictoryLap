import api from './client';
import type { Workout, WorkoutCreatePayload } from '../types';

export async function getWorkouts(skip = 0, limit = 20): Promise<Workout[]> {
  const { data } = await api.get<Workout[]>('/workouts/', { params: { skip, limit } });
  return data;
}

export async function getWorkout(id: string): Promise<Workout> {
  const { data } = await api.get<Workout>(`/workouts/${id}`);
  return data;
}

export async function createWorkout(payload: WorkoutCreatePayload): Promise<Workout> {
  const { data } = await api.post<Workout>('/workouts/', payload);
  return data;
}

export async function deleteWorkout(id: string): Promise<void> {
  await api.delete(`/workouts/${id}`);
}

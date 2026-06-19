import api from './client';
import type { Group, GroupDetail, GroupGoal, GroupMessage } from '../types';

export async function createGroup(name: string): Promise<Group> {
  const { data } = await api.post<Group>('/groups/', { name });
  return data;
}

export async function listMyGroups(): Promise<Group[]> {
  const { data } = await api.get<Group[]>('/groups/');
  return data;
}

export async function getGroup(id: string): Promise<GroupDetail> {
  const { data } = await api.get<GroupDetail>(`/groups/${id}`);
  return data;
}

export async function getGroupByInviteCode(code: string): Promise<Group> {
  const { data } = await api.get<Group>(`/groups/invite/${code}`);
  return data;
}

export async function joinGroupByCode(code: string): Promise<Group> {
  const { data } = await api.post<Group>(`/groups/join-by-code/${code}`);
  return data;
}

export async function getGroupMessages(groupId: string): Promise<GroupMessage[]> {
  const { data } = await api.get<GroupMessage[]>(`/groups/${groupId}/messages`);
  return data;
}

export async function createGroupGoal(
  groupId: string,
  payload: { title: string; description?: string; target_date?: string }
): Promise<GroupGoal> {
  const { data } = await api.post<GroupGoal>(`/groups/${groupId}/goals`, payload);
  return data;
}

export async function completeGroupGoal(groupId: string, goalId: string): Promise<GroupGoal> {
  const { data } = await api.patch<GroupGoal>(`/groups/${groupId}/goals/${goalId}/complete`);
  return data;
}

export async function uploadGroupAttachment(
  groupId: string,
  file: File
): Promise<{ attachment_url: string; attachment_type: string }> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post(`/groups/${groupId}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

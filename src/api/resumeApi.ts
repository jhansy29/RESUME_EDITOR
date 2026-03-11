import { API_BASE, fetchWithAuth } from './config';

const BASE = `${API_BASE}/resumes`;

export interface ResumeMeta {
  _id: string;
  name: string;
  updatedAt: string;
}

export async function listResumes(): Promise<ResumeMeta[]> {
  const res = await fetchWithAuth(BASE);
  if (!res.ok) throw new Error('Failed to list resumes');
  return res.json();
}

export async function getResume(id: string) {
  const res = await fetchWithAuth(`${BASE}/${id}`);
  if (!res.ok) throw new Error('Failed to load resume');
  return res.json();
}

export async function createResume(data: Record<string, unknown>) {
  const res = await fetchWithAuth(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create resume');
  return res.json();
}

export async function patchResume(id: string, section: Record<string, unknown>) {
  const res = await fetchWithAuth(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(section),
  });
  if (!res.ok) throw new Error('Failed to update resume');
  return res.json();
}

export async function duplicateResume(id: string, name?: string) {
  const res = await fetchWithAuth(`${BASE}/${id}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(name ? { name } : {}),
  });
  if (!res.ok) throw new Error('Failed to duplicate resume');
  return res.json();
}

export async function deleteResume(id: string) {
  const res = await fetchWithAuth(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete resume');
  return res.json();
}

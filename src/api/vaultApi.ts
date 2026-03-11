import type { ProfileVault } from '../types/vault';

import { API_BASE, fetchWithAuth } from './config';

const BASE = `${API_BASE}/vault`;

export async function getVault(): Promise<ProfileVault | null> {
  const res = await fetchWithAuth(BASE);
  if (!res.ok) throw new Error('Failed to load vault');
  return res.json();
}

export async function createVault(data: Partial<ProfileVault>): Promise<ProfileVault> {
  const res = await fetchWithAuth(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create vault');
  return res.json();
}

export async function patchVault(id: string, section: Record<string, unknown>): Promise<ProfileVault> {
  const res = await fetchWithAuth(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(section),
  });
  if (!res.ok) throw new Error('Failed to update vault');
  return res.json();
}

export async function deleteVault(id: string): Promise<void> {
  const res = await fetchWithAuth(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete vault');
}

export async function importMasterText(id: string, text: string): Promise<ProfileVault> {
  const res = await fetchWithAuth(`${BASE}/${id}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(err.error || 'Failed to import master text');
  }
  return res.json();
}

export async function importNewVault(text: string, name?: string): Promise<ProfileVault> {
  const res = await fetchWithAuth(`${BASE}/import-new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(err.error || 'Failed to import');
  }
  return res.json();
}

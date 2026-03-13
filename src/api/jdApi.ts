import type { JDAnalysis, ATSScore } from '../types/jd';

import { API_BASE, fetchWithAuth } from './config';

const BASE = `${API_BASE}/jd`;

// --- Saved JDs ---
export interface SavedJDMeta {
  _id: string;
  title: string;
  company: string;
  updatedAt: string;
}

export interface SavedJDFull extends SavedJDMeta {
  jobDescription: string;
  analysis: JDAnalysis | null;
}

export async function listSavedJDs(): Promise<SavedJDMeta[]> {
  const res = await fetchWithAuth(`${BASE}/saved`);
  if (!res.ok) throw new Error('Failed to list saved JDs');
  return res.json();
}

export async function getSavedJD(id: string): Promise<SavedJDFull> {
  const res = await fetchWithAuth(`${BASE}/saved/${id}`);
  if (!res.ok) throw new Error('Failed to load saved JD');
  return res.json();
}

export async function createSavedJD(data: { title: string; company?: string; jobDescription: string; analysis?: JDAnalysis | null }): Promise<SavedJDFull> {
  const res = await fetchWithAuth(`${BASE}/saved`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save JD');
  return res.json();
}

export async function updateSavedJD(id: string, data: Partial<SavedJDFull>): Promise<SavedJDFull> {
  const res = await fetchWithAuth(`${BASE}/saved/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update saved JD');
  return res.json();
}

export async function deleteSavedJD(id: string): Promise<void> {
  const res = await fetchWithAuth(`${BASE}/saved/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete saved JD');
}

export async function fetchJDFromUrl(url: string): Promise<{ jobDescription: string; jobTitle: string; company: string; url: string }> {
  const res = await fetchWithAuth(`${BASE}/fetch-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch JD' }));
    throw new Error(err.error || 'Failed to fetch JD from URL');
  }
  return res.json();
}

export async function analyzeJD(jobDescription: string): Promise<JDAnalysis> {
  const res = await fetchWithAuth(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobDescription }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(err.error || 'Failed to analyze JD');
  }
  return res.json();
}

export async function scoreResume(jdAnalysis: JDAnalysis, resumeId: string): Promise<ATSScore> {
  const res = await fetchWithAuth(`${BASE}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jdAnalysis, resumeId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Scoring failed' }));
    throw new Error(err.error || 'Failed to score resume');
  }
  return res.json();
}

import { API_BASE, fetchWithAuth } from './config';
import type { Application, ApplicationInput, ApplicationStats } from '../types/application';

const BASE = `${API_BASE}/applications`;

export async function listApplications(): Promise<Application[]> {
  const res = await fetchWithAuth(BASE);
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json();
}

export async function getApplication(id: string): Promise<Application> {
  const res = await fetchWithAuth(`${BASE}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch application');
  return res.json();
}

export async function createApplication(data: Partial<ApplicationInput>): Promise<Application> {
  const res = await fetchWithAuth(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create application');
  return res.json();
}

export async function updateApplication(id: string, data: Partial<ApplicationInput>): Promise<Application> {
  const res = await fetchWithAuth(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update application');
  return res.json();
}

export async function deleteApplication(id: string): Promise<void> {
  const res = await fetchWithAuth(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete application');
}

export interface ScrapedJob {
  company: string;
  jobTitle: string;
  location: string;
  salaryRange: string;
  url: string;
}

export async function scrapeJobUrl(url: string): Promise<ScrapedJob> {
  const res = await fetchWithAuth(`${BASE}/scrape-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error('Failed to scrape URL');
  return res.json();
}

export async function getApplicationStats(): Promise<ApplicationStats> {
  const res = await fetchWithAuth(`${BASE}/stats/summary`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

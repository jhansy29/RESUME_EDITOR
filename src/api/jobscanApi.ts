import type { JobscanReport, JobscanStatus, TailorResult, IterationContext } from '../types/jd';
import type { JDAnalysis } from '../types/jd';
import { API_BASE, fetchWithAuth } from './config';

const JOBSCAN_BASE = `${API_BASE}/jobscan`;
const JD_BASE = `${API_BASE}/jd`;

export async function getJobscanStatus(): Promise<JobscanStatus> {
  const res = await fetchWithAuth(`${JOBSCAN_BASE}/status`);
  if (!res.ok) throw new Error('Failed to check Jobscan status');
  return res.json();
}

export async function loginJobscan(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetchWithAuth(`${JOBSCAN_BASE}/login`, { method: 'POST' });
  return res.json();
}

export async function scanJobscan(resumeId: string, jdText: string): Promise<JobscanReport> {
  const res = await fetchWithAuth(`${JOBSCAN_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId, jdText }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Scan failed' }));
    throw new Error(err.error || 'Jobscan scan failed');
  }
  return res.json();
}

export async function rescanJobscan(resumeId: string): Promise<JobscanReport> {
  const res = await fetchWithAuth(`${JOBSCAN_BASE}/rescan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Rescan failed' }));
    throw new Error(err.error || 'Jobscan rescan failed');
  }
  return res.json();
}

export async function closeJobscan(): Promise<void> {
  await fetchWithAuth(`${JOBSCAN_BASE}/close`, { method: 'POST' });
}

export async function scanAndIterate(
  resumeId: string,
  jdAnalysis: JDAnalysis,
  jdText: string,
  iterationContext?: IterationContext
): Promise<{ jobscanReport: JobscanReport; tailorResult: TailorResult | null }> {
  const res = await fetchWithAuth(`${JD_BASE}/scan-and-iterate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId, jdAnalysis, jdText, iterationContext }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Scan failed' }));
    throw new Error(err.error || 'Scan and iterate failed');
  }
  return res.json();
}

export async function tailorResume(
  resumeId: string,
  jdAnalysis: JDAnalysis,
  jobscanGaps?: { hardSkills?: { missing: string[] }; softSkills?: { missing: string[] } },
  iterationContext?: IterationContext
): Promise<TailorResult> {
  const res = await fetchWithAuth(`${JD_BASE}/tailor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId, jdAnalysis, jobscanGaps, iterationContext }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Tailoring failed' }));
    throw new Error(err.error || 'Resume tailoring failed');
  }
  return res.json();
}

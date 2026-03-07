import type { JDAnalysis, ATSScore } from '../types/jd';

const BASE = 'http://localhost:3001/api/jd';

export async function analyzeJD(jobDescription: string, resumeId?: string): Promise<JDAnalysis> {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobDescription, resumeId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(err.error || 'Failed to analyze JD');
  }
  return res.json();
}

export async function scoreResume(jdAnalysis: JDAnalysis, resumeId: string): Promise<ATSScore> {
  const res = await fetch(`${BASE}/score`, {
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

import type { Suggestion } from '../types/suggestions';
import type { JDAnalysis } from '../types/jd';
import type { ProfileVault } from '../types/vault';
import type { ResumeData } from '../types/resume';

const BASE = 'http://localhost:3001/api/suggestions';

export async function generateSuggestions(
  jdAnalysis: JDAnalysis,
  vault: ProfileVault | null,
  currentResume: ResumeData
): Promise<Suggestion[]> {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jdAnalysis, vault, currentResume }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Generation failed' }));
    throw new Error(err.error || 'Failed to generate suggestions');
  }
  const data = await res.json();
  return (data.suggestions || []).map((s: Suggestion) => ({ ...s, status: 'pending' }));
}

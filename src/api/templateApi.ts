const BASE = 'http://localhost:3001/api/templates';

export interface TemplateMeta {
  _id: string;
  name: string;
  description: string;
  updatedAt: string;
}

export async function listTemplates(): Promise<TemplateMeta[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Failed to list templates');
  return res.json();
}

export async function getTemplate(id: string) {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('Failed to load template');
  return res.json();
}

export async function createTemplate(data: Record<string, unknown>) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create template');
  return res.json();
}

export async function patchTemplate(id: string, data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update template');
  return res.json();
}

export async function deleteTemplate(id: string) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete template');
  return res.json();
}

export async function generateTemplate(input: { file?: File; text?: string; name?: string }) {
  const form = new FormData();
  if (input.file) form.append('file', input.file);
  if (input.text) form.append('text', input.text);
  if (input.name) form.append('name', input.name);

  const res = await fetch('http://localhost:3001/api/generate-template', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to generate template');
  }
  return res.json();
}

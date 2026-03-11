import { API_BASE } from './config';

export interface AuthUser {
  _id: string;
  email: string;
  name: string;
  plan: string;
  quotas: {
    maxResumes: number;
    maxApplications: number;
    maxSavedJDs: number;
  };
}

const opts = (method: string, body?: unknown): RequestInit => ({
  method,
  credentials: 'include',
  headers: body ? { 'Content-Type': 'application/json' } : undefined,
  body: body ? JSON.stringify(body) : undefined,
});

export async function register(name: string, email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/register`, opts('POST', { name, email, password }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(err.error);
  }
  const data = await res.json();
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/login`, opts('POST', { email, password }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error);
  }
  const data = await res.json();
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, opts('POST'));
}

export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}

export async function refreshToken(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/refresh`, opts('POST'));
  return res.ok;
}

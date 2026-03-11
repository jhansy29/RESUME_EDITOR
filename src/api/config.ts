export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

let _isRefreshing = false;
let _refreshPromise: Promise<boolean> | null = null;

export async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, { ...options, credentials: 'include' });

  if (res.status === 401) {
    // Avoid concurrent refresh attempts
    if (!_isRefreshing) {
      _isRefreshing = true;
      _refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      }).then((r) => r.ok).finally(() => { _isRefreshing = false; });
    }

    const refreshed = await _refreshPromise;
    if (refreshed) {
      // Retry the original request
      return fetch(url, { ...options, credentials: 'include' });
    }

    // Refresh failed, redirect to login
    window.location.hash = '#view=login';
    throw new Error('Session expired');
  }

  return res;
}

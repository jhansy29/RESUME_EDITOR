import { create } from 'zustand';
import type { AuthUser } from '../api/authApi';
import * as authApi from '../api/authApi';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string;

  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: '',

  checkAuth: async () => {
    try {
      const user = await authApi.getMe();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ error: '', loading: true });
    try {
      const user = await authApi.login(email, password);
      set({ user, loading: false, error: '' });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ error: '', loading: true });
    try {
      const user = await authApi.register(name, email, password);
      set({ user, loading: false, error: '' });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      throw err;
    }
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null });
  },

  clearError: () => set({ error: '' }),
}));

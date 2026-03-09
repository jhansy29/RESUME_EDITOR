import { create } from 'zustand';
import type { Application, ApplicationStatus } from '../types/application';
import {
  listApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../api/applicationsApi';

interface TrackerState {
  applications: Application[];
  loading: boolean;
  error: string | null;
  filterStatus: ApplicationStatus | 'All';
  searchQuery: string;
  sortField: 'dateApplied' | 'company' | 'status' | 'dateUpdated';
  sortDir: 'asc' | 'desc';
  editingId: string | null;

  fetch: () => Promise<void>;
  add: (data: Partial<Application>) => Promise<void>;
  update: (id: string, data: Partial<Application>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setFilterStatus: (status: ApplicationStatus | 'All') => void;
  setSearchQuery: (q: string) => void;
  setSortField: (field: TrackerState['sortField']) => void;
  toggleSortDir: () => void;
  setEditingId: (id: string | null) => void;
}

export const useTrackerStore = create<TrackerState>((set, get) => ({
  applications: [],
  loading: false,
  error: null,
  filterStatus: 'All',
  searchQuery: '',
  sortField: 'dateApplied',
  sortDir: 'desc',
  editingId: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const apps = await listApplications();
      set({ applications: apps, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  add: async (data) => {
    try {
      const app = await createApplication(data);
      set((s) => ({ applications: [app, ...s.applications] }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  update: async (id, data) => {
    try {
      const updated = await updateApplication(id, data);
      set((s) => ({
        applications: s.applications.map((a) => (a._id === id ? updated : a)),
        editingId: null,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  remove: async (id) => {
    try {
      await deleteApplication(id);
      set((s) => ({
        applications: s.applications.filter((a) => a._id !== id),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  setFilterStatus: (status) => set({ filterStatus: status }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSortField: (field) => {
    const current = get().sortField;
    if (current === field) {
      get().toggleSortDir();
    } else {
      set({ sortField: field, sortDir: 'desc' });
    }
  },
  toggleSortDir: () => set((s) => ({ sortDir: s.sortDir === 'asc' ? 'desc' : 'asc' })),
  setEditingId: (id) => set({ editingId: id }),
}));

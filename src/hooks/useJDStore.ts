import { create } from 'zustand';
import type { JDAnalysis, ATSScore } from '../types/jd';
import { analyzeJD, scoreResume, listSavedJDs, getSavedJD, createSavedJD, updateSavedJD, deleteSavedJD, type SavedJDMeta } from '../api/jdApi';

interface JDStore {
  jdText: string;
  analysis: JDAnalysis | null;
  loading: boolean;
  error: string;
  savedJDs: SavedJDMeta[];
  activeJDId: string | null;

  setJDText: (text: string) => void;
  analyze: (resumeId?: string) => Promise<void>;
  rescore: (resumeId: string) => Promise<void>;
  clearAnalysis: () => void;

  // Saved JDs
  loadSavedJDs: () => Promise<void>;
  loadSavedJD: (id: string) => Promise<void>;
  saveCurrentJD: (title: string, company?: string) => Promise<void>;
  updateCurrentJD: () => Promise<void>;
  removeSavedJD: (id: string) => Promise<void>;
}

export const useJDStore = create<JDStore>((set, get) => ({
  jdText: '',
  analysis: null,
  loading: false,
  error: '',
  savedJDs: [],
  activeJDId: null,

  setJDText: (text) => set({ jdText: text }),

  analyze: async (resumeId) => {
    const { jdText } = get();
    if (!jdText.trim()) return;
    set({ loading: true, error: '' });
    try {
      const result = await analyzeJD(jdText, resumeId);
      set({ analysis: result, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  rescore: async (resumeId) => {
    const { analysis } = get();
    if (!analysis) return;
    set({ loading: true, error: '' });
    try {
      const atsScore = await scoreResume(analysis, resumeId);
      set({ analysis: { ...analysis, atsScore }, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  clearAnalysis: () => set({ jdText: '', analysis: null, error: '', activeJDId: null }),

  loadSavedJDs: async () => {
    try {
      const list = await listSavedJDs();
      set({ savedJDs: list });
    } catch { /* ignore */ }
  },

  loadSavedJD: async (id) => {
    try {
      const jd = await getSavedJD(id);
      set({
        jdText: jd.jobDescription,
        analysis: jd.analysis,
        activeJDId: jd._id,
        error: '',
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  saveCurrentJD: async (title, company) => {
    const { jdText, analysis } = get();
    if (!jdText.trim()) return;
    try {
      const saved = await createSavedJD({ title, company, jobDescription: jdText, analysis });
      set({ activeJDId: saved._id });
      await get().loadSavedJDs();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  updateCurrentJD: async () => {
    const { activeJDId, jdText, analysis } = get();
    if (!activeJDId) return;
    try {
      await updateSavedJD(activeJDId, { jobDescription: jdText, analysis } as Record<string, unknown>);
      await get().loadSavedJDs();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  removeSavedJD: async (id) => {
    try {
      await deleteSavedJD(id);
      const { activeJDId } = get();
      if (activeJDId === id) {
        set({ activeJDId: null });
      }
      await get().loadSavedJDs();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
}));

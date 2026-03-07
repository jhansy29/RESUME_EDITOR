import { create } from 'zustand';
import type { JDAnalysis, ATSScore } from '../types/jd';
import { analyzeJD, scoreResume } from '../api/jdApi';

interface JDStore {
  jdText: string;
  analysis: JDAnalysis | null;
  loading: boolean;
  error: string;

  setJDText: (text: string) => void;
  analyze: (resumeId?: string) => Promise<void>;
  rescore: (resumeId: string) => Promise<void>;
  clearAnalysis: () => void;
}

export const useJDStore = create<JDStore>((set, get) => ({
  jdText: '',
  analysis: null,
  loading: false,
  error: '',

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

  clearAnalysis: () => set({ jdText: '', analysis: null, error: '' }),
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JDAnalysis, ATSScore, JobscanReport, JobscanStatus, TailorResult, WorkflowStep, IterationContext } from '../types/jd';
import { analyzeJD, scoreResume, fetchJDFromUrl, listSavedJDs, getSavedJD, createSavedJD, updateSavedJD, deleteSavedJD, type SavedJDMeta } from '../api/jdApi';
import { getJobscanStatus, loginJobscan, scanJobscan, rescanJobscan, tailorResume } from '../api/jobscanApi';

interface JDStore {
  jdText: string;
  analysis: JDAnalysis | null;
  loading: boolean;
  error: string;
  savedJDs: SavedJDMeta[];
  activeJDId: string | null;

  // Workflow
  workflowStep: WorkflowStep;
  tailorResult: TailorResult | null;
  tailorLoading: boolean;
  tailorAccepted: Record<string, boolean>; // keyed by bulletId or 'summary' or 'skills'

  // Iteration loop
  iterationCount: number;
  scoreHistory: Array<{ round: number; score: number }>;
  previousChangesApplied: string[];
  remainingGaps: { hardSkills: string[]; softSkills: string[] } | null;

  // Jobscan
  jobscanStatus: JobscanStatus | null;
  jobscanReport: JobscanReport | null;
  jobscanLoading: boolean;
  jobscanError: string;

  // Actions
  setJDText: (text: string) => void;
  analyze: () => Promise<void>;
  rescore: (resumeId: string) => Promise<void>;
  clearAnalysis: () => void;
  setWorkflowStep: (step: WorkflowStep) => void;

  // Tailoring
  generateTailor: (resumeId: string) => Promise<void>;
  setTailorAccepted: (key: string, accepted: boolean) => void;
  acceptAllTailor: () => void;
  clearTailor: () => void;

  // Iteration loop
  recordAppliedChanges: (descriptions: string[]) => void;
  recordScanResult: (score: number) => void;
  generateNextIteration: (resumeId: string) => Promise<void>;

  // Jobscan
  checkJobscanStatus: () => Promise<void>;
  loginToJobscan: () => Promise<void>;
  runJobscanScan: (resumeId: string) => Promise<void>;
  runJobscanRescan: (resumeId: string) => Promise<void>;
  clearJobscan: () => void;

  // Fetch JD from URL
  fetchUrlLoading: boolean;
  fetchFromUrl: (url: string) => Promise<void>;

  // Saved JDs
  loadSavedJDs: () => Promise<void>;
  loadSavedJD: (id: string) => Promise<void>;
  saveCurrentJD: (title: string, company?: string) => Promise<void>;
  updateCurrentJD: () => Promise<void>;
  removeSavedJD: (id: string) => Promise<void>;
}

function buildAcceptedMap(result: TailorResult): Record<string, boolean> {
  const accepted: Record<string, boolean> = { summary: true, skills: true };
  for (const bc of (result.bulletChanges || [])) {
    accepted[bc.bulletId] = true;
  }
  for (const br of (result.bulletReorders || [])) {
    accepted[`reorder-${br.entryId}`] = true;
  }
  for (const bs of (result.bulletSwaps || [])) {
    accepted[`swap-${bs.removeBulletId}`] = true;
  }
  if (result.projectSwaps?.remove) {
    for (const projId of result.projectSwaps.remove) {
      accepted[`remove-proj-${projId}`] = true;
    }
  }
  if (result.projectSwaps?.add) {
    for (let i = 0; i < result.projectSwaps.add.length; i++) {
      accepted[`add-proj-${i}`] = true;
    }
  }
  return accepted;
}

export const useJDStore = create<JDStore>()(persist((set, get) => ({
  jdText: '',
  analysis: null,
  loading: false,
  error: '',
  savedJDs: [],
  activeJDId: null,

  // Workflow
  workflowStep: 'input',
  tailorResult: null,
  tailorLoading: false,
  tailorAccepted: {},

  // Iteration loop
  iterationCount: 0,
  scoreHistory: [],
  previousChangesApplied: [],
  remainingGaps: null,

  // Fetch URL
  fetchUrlLoading: false,

  // Jobscan
  jobscanStatus: null,
  jobscanReport: null,
  jobscanLoading: false,
  jobscanError: '',

  setJDText: (text) => set({ jdText: text }),
  setWorkflowStep: (step) => set({ workflowStep: step }),

  analyze: async () => {
    const { jdText } = get();
    if (!jdText.trim()) return;
    set({
      loading: true, error: '',
      // Reset all scan/iteration state for fresh analysis
      scoreHistory: [],
      iterationCount: 0,
      jobscanReport: null,
      jobscanError: '',
      tailorResult: null,
      tailorAccepted: {},
      previousChangesApplied: [],
      remainingGaps: null,
    });
    try {
      const result = await analyzeJD(jdText);
      set({ analysis: result, loading: false, workflowStep: 'analyzed' });
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

  clearAnalysis: () => set({
    jdText: '',
    analysis: null,
    error: '',
    activeJDId: null,
    workflowStep: 'input',
    tailorResult: null,
    tailorAccepted: {},
    jobscanReport: null,
    jobscanError: '',
    iterationCount: 0,
    scoreHistory: [],
    previousChangesApplied: [],
    remainingGaps: null,
  }),

  // --- Tailoring ---
  generateTailor: async (resumeId) => {
    const { analysis, jobscanReport } = get();
    if (!analysis) return;
    set({ tailorLoading: true, tailorResult: null, tailorAccepted: {}, workflowStep: 'tailoring', error: '' });
    try {
      const gaps = jobscanReport ? {
        hardSkills: { missing: jobscanReport.hardSkills.missing },
        softSkills: { missing: jobscanReport.softSkills.missing },
      } : undefined;

      const result = await tailorResume(resumeId, analysis, gaps);
      const accepted = buildAcceptedMap(result);

      set({
        tailorResult: result,
        tailorLoading: false,
        tailorAccepted: accepted,
        workflowStep: 'tailor-preview',
        iterationCount: 1,
      });
    } catch (err) {
      set({ error: (err as Error).message, tailorLoading: false, workflowStep: 'analyzed' });
    }
  },

  setTailorAccepted: (key, accepted) => {
    set({ tailorAccepted: { ...get().tailorAccepted, [key]: accepted } });
  },

  acceptAllTailor: () => {
    const { tailorResult } = get();
    if (!tailorResult) return;
    set({ tailorAccepted: buildAcceptedMap(tailorResult) });
  },

  clearTailor: () => set({ tailorResult: null, tailorAccepted: {}, workflowStep: 'analyzed' }),

  // --- Iteration loop ---
  recordAppliedChanges: (descriptions) => {
    const { previousChangesApplied } = get();
    set({ previousChangesApplied: [...previousChangesApplied, ...descriptions] });
  },

  recordScanResult: (score) => {
    const { iterationCount, scoreHistory, jobscanReport } = get();
    const newHistory = [...scoreHistory, { round: iterationCount, score }];
    const gaps = jobscanReport ? {
      hardSkills: jobscanReport.hardSkills.missing,
      softSkills: jobscanReport.softSkills.missing,
    } : null;
    set({ scoreHistory: newHistory, remainingGaps: gaps });
  },

  generateNextIteration: async (resumeId) => {
    const { analysis, iterationCount, scoreHistory, previousChangesApplied, remainingGaps, jobscanReport } = get();
    if (!analysis) return;

    const nextRound = iterationCount + 1;
    set({ tailorLoading: true, tailorResult: null, tailorAccepted: {}, workflowStep: 'tailoring', error: '' });

    try {
      const gaps = jobscanReport ? {
        hardSkills: { missing: jobscanReport.hardSkills.missing },
        softSkills: { missing: jobscanReport.softSkills.missing },
      } : undefined;

      const iterationCtx: IterationContext = {
        round: nextRound,
        scoreHistory,
        previousChangesApplied,
        remainingGaps: remainingGaps || { hardSkills: [], softSkills: [] },
      };

      const result = await tailorResume(resumeId, analysis, gaps, iterationCtx);
      const accepted = buildAcceptedMap(result);

      set({
        tailorResult: result,
        tailorLoading: false,
        tailorAccepted: accepted,
        workflowStep: 'tailor-preview',
        iterationCount: nextRound,
      });
    } catch (err) {
      set({ error: (err as Error).message, tailorLoading: false, workflowStep: 'results' });
    }
  },

  // --- Jobscan ---
  checkJobscanStatus: async () => {
    try {
      const status = await getJobscanStatus();
      set({ jobscanStatus: status });
    } catch {
      set({ jobscanStatus: { active: false, onMatchReport: false } });
    }
  },

  loginToJobscan: async () => {
    set({ jobscanLoading: true, jobscanError: '' });
    try {
      const result = await loginJobscan();
      if (!result.ok) throw new Error(result.error || 'Login failed');
      set({ jobscanLoading: false, jobscanStatus: { active: true, onMatchReport: false } });
    } catch (err) {
      set({ jobscanError: (err as Error).message, jobscanLoading: false });
    }
  },

  runJobscanScan: async (resumeId) => {
    const { jdText } = get();
    if (!jdText.trim()) return;
    set({ jobscanLoading: true, jobscanError: '', workflowStep: 'scanning' });
    try {
      const report = await scanJobscan(resumeId, jdText);
      set({
        jobscanReport: report,
        jobscanLoading: false,
        workflowStep: 'results',
        jobscanStatus: { active: true, onMatchReport: true },
      });
    } catch (err) {
      set({ jobscanError: (err as Error).message, jobscanLoading: false, workflowStep: 'analyzed' });
    }
  },

  runJobscanRescan: async (resumeId) => {
    set({ jobscanLoading: true, jobscanError: '' });
    try {
      const report = await rescanJobscan(resumeId);
      set({
        jobscanReport: report,
        jobscanLoading: false,
        workflowStep: 'results',
      });
    } catch (err) {
      // Fall back to full scan
      set({ jobscanError: (err as Error).message, jobscanLoading: false });
    }
  },

  clearJobscan: () => set({ jobscanReport: null, jobscanError: '' }),

  // --- Fetch JD from URL ---
  fetchFromUrl: async (url) => {
    set({ fetchUrlLoading: true, error: '' });
    try {
      const result = await fetchJDFromUrl(url);
      set({ jdText: result.jobDescription, fetchUrlLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, fetchUrlLoading: false });
    }
  },

  // --- Saved JDs ---
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
        workflowStep: jd.analysis ? 'analyzed' : 'input',
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
}), {
  name: 'jd-store',
  partialize: (state) => ({
    jdText: state.jdText,
    analysis: state.analysis,
    activeJDId: state.activeJDId,
    workflowStep: state.workflowStep,
    jobscanReport: state.jobscanReport,
    tailorResult: state.tailorResult,
    tailorAccepted: state.tailorAccepted,
    iterationCount: state.iterationCount,
    scoreHistory: state.scoreHistory,
  }),
}));

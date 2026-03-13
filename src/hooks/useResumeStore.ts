import { create } from 'zustand';
import { produce } from 'immer';
import { nanoid } from 'nanoid';
import type { ResumeData, ContactInfo, EducationEntry, SkillRow, ExperienceEntry, ProjectEntry, FormatSettings, LayoutSchema, CustomSectionFormat } from '../types/resume';
import { DEFAULT_FORMAT, DEFAULT_LAYOUT } from '../types/resume';
import { sampleResume } from '../data/sampleResume';
import { patchResume } from '../api/resumeApi';

const STORAGE_KEY = 'resume-editor-data';

function loadInitialData(): ResumeData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt data */ }
  return sampleResume;
}

export type ResumeSection = 'contact' | 'education' | 'skills' | 'experience' | 'projects' | 'summary' | `custom-${string}`;

const MAX_HISTORY = 50;

interface ResumeStore {
  data: ResumeData;
  activeSection: ResumeSection | null;
  mongoId: string | null;
  resumeName: string | null;
  loading: boolean;
  _history: ResumeData[];
  _future: ResumeData[];

  setActiveSection: (section: ResumeSection | null) => void;
  setMongoId: (id: string) => void;
  setResumeName: (name: string) => void;
  setLoading: (loading: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Contact
  updateContact: <K extends keyof ContactInfo>(field: K, value: ContactInfo[K]) => void;

  // Education
  addEducation: () => void;
  removeEducation: (id: string) => void;
  updateEducation: <K extends keyof EducationEntry>(id: string, field: K, value: EducationEntry[K]) => void;
  reorderEducation: (fromIndex: number, toIndex: number) => void;

  // Skills
  addSkillRow: () => void;
  removeSkillRow: (id: string) => void;
  updateSkillRow: <K extends keyof SkillRow>(id: string, field: K, value: SkillRow[K]) => void;
  reorderSkills: (fromIndex: number, toIndex: number) => void;

  // Experience
  addExperience: () => string;
  removeExperience: (id: string) => void;
  updateExperience: <K extends keyof ExperienceEntry>(id: string, field: K, value: ExperienceEntry[K]) => void;
  reorderExperience: (fromIndex: number, toIndex: number) => void;
  addBullet: (parentId: string, section: 'experience' | 'projects') => string;
  insertBulletAfter: (parentId: string, afterBulletId: string, text: string, section: 'experience' | 'projects') => string;
  removeBullet: (parentId: string, bulletId: string, section: 'experience' | 'projects') => void;
  updateBullet: (parentId: string, bulletId: string, text: string, section: 'experience' | 'projects') => void;
  reorderBullets: (parentId: string, fromIndex: number, toIndex: number, section: 'experience' | 'projects') => void;

  // Projects
  addProject: () => string;
  removeProject: (id: string) => void;
  updateProject: <K extends keyof ProjectEntry>(id: string, field: K, value: ProjectEntry[K]) => void;
  reorderProjects: (fromIndex: number, toIndex: number) => void;

  // Custom Sections
  addCustomSection: (title: string, format?: CustomSectionFormat) => void;
  removeCustomSection: (id: string) => void;
  updateCustomSectionTitle: (id: string, title: string) => void;
  reorderCustomSections: (fromIndex: number, toIndex: number) => void;
  addCustomItem: (sectionId: string) => void;
  insertCustomItemAfter: (sectionId: string, afterItemId: string, text: string) => string;
  removeCustomItem: (sectionId: string, itemId: string) => void;
  updateCustomItem: (sectionId: string, itemId: string, text: string) => void;
  reorderCustomItems: (sectionId: string, fromIndex: number, toIndex: number) => void;
  // Custom Section Entries (for experience/projects format)
  addCustomEntry: (sectionId: string) => string;
  removeCustomEntry: (sectionId: string, entryId: string) => void;
  updateCustomEntry: (sectionId: string, entryId: string, field: string, value: string) => void;
  reorderCustomEntries: (sectionId: string, fromIndex: number, toIndex: number) => void;
  addCustomEntryBullet: (sectionId: string, entryId: string) => string;
  removeCustomEntryBullet: (sectionId: string, entryId: string, bulletId: string) => void;
  updateCustomEntryBullet: (sectionId: string, entryId: string, bulletId: string, text: string) => void;
  reorderCustomEntryBullets: (sectionId: string, entryId: string, fromIndex: number, toIndex: number) => void;

  // Section Order
  moveSectionOrder: (fromIndex: number, toIndex: number) => void;

  // Summary
  updateSummary: (text: string) => void;

  // Section Gaps
  updateSectionGap: (sectionKey: string, gap: number) => void;
  updateEntryGap: (entryId: string, gap: number) => void;

  // Formatting
  updateFormat: <K extends keyof FormatSettings>(key: K, value: FormatSettings[K]) => void;
  resetFormat: () => void;

  // Layout
  updateLayout: <S extends keyof LayoutSchema>(section: S, updates: Partial<LayoutSchema[S]>) => void;
  resetLayout: () => void;

  // Global
  loadData: (data: ResumeData) => void;
  resetToSample: () => void;
  flushSave: () => Promise<void>;
}

function reorder<T>(list: T[], from: number, to: number): T[] {
  const result = [...list];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
}

// Debounced save to MongoDB
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function debouncedSave(getState: () => ResumeStore) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { mongoId, data } = getState();
    if (mongoId) {
      patchResume(mongoId, data as unknown as Record<string, unknown>).catch(console.error);
    }
    // Also save to localStorage as fallback
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, 800);
}

export const useResumeStore = create<ResumeStore>((set, get) => {
  const setAndSave: typeof set = (partial, replace) => {
    const prev = get().data;
    set(partial, replace);
    const next = get().data;
    // Only push to history if data actually changed
    if (prev !== next) {
      set(produce((s: ResumeStore) => {
        s._history.push(prev);
        if (s._history.length > MAX_HISTORY) s._history.shift();
        s._future = [];
      }));
    }
    debouncedSave(get);
  };

  return {
    data: loadInitialData(),
    activeSection: null,
    mongoId: null,
    resumeName: null,
    loading: true,
    _history: [] as ResumeData[],
    _future: [] as ResumeData[],

    setActiveSection: (section) => set({ activeSection: section }),
    setMongoId: (id) => set({ mongoId: id }),
    setResumeName: (name) => set({ resumeName: name }),
    setLoading: (loading) => set({ loading }),
    undo: () => {
      const { _history, data } = get();
      if (_history.length === 0) return;
      const prev = _history[_history.length - 1];
      set(produce((s: ResumeStore) => {
        s._future.push(data);
        s.data = prev;
        s._history.pop();
      }));
      debouncedSave(get);
    },
    redo: () => {
      const { _future, data } = get();
      if (_future.length === 0) return;
      const next = _future[_future.length - 1];
      set(produce((s: ResumeStore) => {
        s._history.push(data);
        s.data = next;
        s._future.pop();
      }));
      debouncedSave(get);
    },
    canUndo: () => get()._history.length > 0,
    canRedo: () => get()._future.length > 0,

    // Contact
    updateContact: (field, value) =>
      setAndSave(produce((s: ResumeStore) => { s.data.contact[field] = value as never; })),

    // Education
    addEducation: () =>
      setAndSave(produce((s: ResumeStore) => {
        s.data.education.push({ id: nanoid(), school: '', location: '', degree: '', dates: '' });
      })),
    removeEducation: (id) =>
      setAndSave(produce((s: ResumeStore) => {
        s.data.education = s.data.education.filter(e => e.id !== id);
      })),
    updateEducation: (id, field, value) =>
      setAndSave(produce((s: ResumeStore) => {
        const entry = s.data.education.find(e => e.id === id);
        if (entry) (entry as Record<string, unknown>)[field as string] = value;
      })),
    reorderEducation: (from, to) =>
      setAndSave(produce((s: ResumeStore) => { s.data.education = reorder(s.data.education, from, to); })),

    // Skills
    addSkillRow: () =>
      setAndSave(produce((s: ResumeStore) => {
        s.data.skills.push({ id: nanoid(), category: '', skills: '' });
      })),
    removeSkillRow: (id) =>
      setAndSave(produce((s: ResumeStore) => {
        s.data.skills = s.data.skills.filter(r => r.id !== id);
      })),
    updateSkillRow: (id, field, value) =>
      setAndSave(produce((s: ResumeStore) => {
        const row = s.data.skills.find(r => r.id === id);
        if (row) (row as Record<string, unknown>)[field as string] = value;
      })),
    reorderSkills: (from, to) =>
      setAndSave(produce((s: ResumeStore) => { s.data.skills = reorder(s.data.skills, from, to); })),

    // Experience
    addExperience: () => {
      const newId = nanoid();
      setAndSave(produce((s: ResumeStore) => {
        s.data.experience.push({ id: newId, company: '', location: '', role: '', dates: '', bullets: [] });
      }));
      return newId;
    },
    removeExperience: (id) =>
      setAndSave(produce((s: ResumeStore) => {
        s.data.experience = s.data.experience.filter(e => e.id !== id);
      })),
    updateExperience: (id, field, value) =>
      setAndSave(produce((s: ResumeStore) => {
        const entry = s.data.experience.find(e => e.id === id);
        if (entry) (entry as Record<string, unknown>)[field as string] = value;
      })),
    reorderExperience: (from, to) =>
      setAndSave(produce((s: ResumeStore) => { s.data.experience = reorder(s.data.experience, from, to); })),

    // Bullets (shared for experience + projects)
    addBullet: (parentId, section) => {
      const newId = nanoid();
      setAndSave(produce((s: ResumeStore) => {
        const list = s.data[section] as (ExperienceEntry | ProjectEntry)[];
        const parent = list.find(e => e.id === parentId);
        if (parent) parent.bullets.push({ id: newId, text: '' });
      }));
      return newId;
    },
    insertBulletAfter: (parentId, afterBulletId, text, section) => {
      const newId = nanoid();
      setAndSave(produce((s: ResumeStore) => {
        const list = s.data[section] as (ExperienceEntry | ProjectEntry)[];
        const parent = list.find(e => e.id === parentId);
        if (parent) {
          const idx = parent.bullets.findIndex(b => b.id === afterBulletId);
          if (idx !== -1) {
            parent.bullets.splice(idx + 1, 0, { id: newId, text });
          } else {
            parent.bullets.push({ id: newId, text });
          }
        }
      }));
      return newId;
    },
    removeBullet: (parentId, bulletId, section) =>
      setAndSave(produce((s: ResumeStore) => {
        const list = s.data[section] as (ExperienceEntry | ProjectEntry)[];
        const parent = list.find(e => e.id === parentId);
        if (parent) parent.bullets = parent.bullets.filter(b => b.id !== bulletId);
      })),
    updateBullet: (parentId, bulletId, text, section) =>
      setAndSave(produce((s: ResumeStore) => {
        const list = s.data[section] as (ExperienceEntry | ProjectEntry)[];
        const parent = list.find(e => e.id === parentId);
        if (parent) {
          const bullet = parent.bullets.find(b => b.id === bulletId);
          if (bullet) bullet.text = text;
        }
      })),
    reorderBullets: (parentId, from, to, section) =>
      setAndSave(produce((s: ResumeStore) => {
        const list = s.data[section] as (ExperienceEntry | ProjectEntry)[];
        const parent = list.find(e => e.id === parentId);
        if (parent) parent.bullets = reorder(parent.bullets, from, to);
      })),

    // Projects
    addProject: () => {
      const newId = nanoid();
      setAndSave(produce((s: ResumeStore) => {
        s.data.projects.push({ id: newId, title: '', bullets: [] });
      }));
      return newId;
    },
    removeProject: (id) =>
      setAndSave(produce((s: ResumeStore) => {
        s.data.projects = s.data.projects.filter(p => p.id !== id);
      })),
    updateProject: (id, field, value) =>
      setAndSave(produce((s: ResumeStore) => {
        const entry = s.data.projects.find(p => p.id === id);
        if (entry) (entry as Record<string, unknown>)[field as string] = value;
      })),
    reorderProjects: (from, to) =>
      setAndSave(produce((s: ResumeStore) => { s.data.projects = reorder(s.data.projects, from, to); })),

    // Custom Sections
    addCustomSection: (title, format) =>
      setAndSave(produce((s: ResumeStore) => {
        if (!s.data.customSections) s.data.customSections = [];
        const section: { id: string; title: string; format?: CustomSectionFormat; items: { id: string; text: string }[]; entries?: (ExperienceEntry | ProjectEntry)[] } = { id: nanoid(), title, items: [] };
        if (format && format !== 'bullets') {
          section.format = format;
          section.entries = [];
        }
        s.data.customSections.push(section);
      })),
    removeCustomSection: (id) =>
      setAndSave(produce((s: ResumeStore) => {
        if (s.data.customSections) s.data.customSections = s.data.customSections.filter(cs => cs.id !== id);
      })),
    updateCustomSectionTitle: (id, title) =>
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === id);
        if (sec) sec.title = title;
      })),
    reorderCustomSections: (from, to) =>
      setAndSave(produce((s: ResumeStore) => {
        if (s.data.customSections) s.data.customSections = reorder(s.data.customSections, from, to);
      })),
    addCustomItem: (sectionId) =>
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        if (sec) sec.items.push({ id: nanoid(), text: '' });
      })),
    insertCustomItemAfter: (sectionId, afterItemId, text) => {
      const newId = nanoid();
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        if (sec) {
          const idx = sec.items.findIndex(i => i.id === afterItemId);
          if (idx !== -1) {
            sec.items.splice(idx + 1, 0, { id: newId, text });
          }
        }
      }));
      return newId;
    },
    removeCustomItem: (sectionId, itemId) =>
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        if (sec) sec.items = sec.items.filter(i => i.id !== itemId);
      })),
    updateCustomItem: (sectionId, itemId, text) =>
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        const item = sec?.items.find(i => i.id === itemId);
        if (item) item.text = text;
      })),
    reorderCustomItems: (sectionId, from, to) =>
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        if (sec) sec.items = reorder(sec.items, from, to);
      })),

    // Custom Section Entries (for experience/projects format)
    addCustomEntry: (sectionId) => {
      const newId = nanoid();
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        if (!sec) return;
        if (!sec.entries) sec.entries = [];
        if (sec.format === 'projects') {
          sec.entries.push({ id: newId, title: '', bullets: [] } as ProjectEntry);
        } else {
          sec.entries.push({ id: newId, company: '', location: '', role: '', dates: '', bullets: [] } as ExperienceEntry);
        }
      }));
      return newId;
    },
    removeCustomEntry: (sectionId, entryId) =>
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        if (sec?.entries) sec.entries = sec.entries.filter(e => e.id !== entryId);
      })),
    updateCustomEntry: (sectionId, entryId, field, value) =>
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        const entry = sec?.entries?.find(e => e.id === entryId);
        if (entry) (entry as Record<string, unknown>)[field] = value;
      })),
    reorderCustomEntries: (sectionId, from, to) =>
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        if (sec?.entries) sec.entries = reorder(sec.entries, from, to);
      })),
    addCustomEntryBullet: (sectionId, entryId) => {
      const newId = nanoid();
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        const entry = sec?.entries?.find(e => e.id === entryId);
        if (entry) entry.bullets.push({ id: newId, text: '' });
      }));
      return newId;
    },
    removeCustomEntryBullet: (sectionId, entryId, bulletId) =>
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        const entry = sec?.entries?.find(e => e.id === entryId);
        if (entry) entry.bullets = entry.bullets.filter(b => b.id !== bulletId);
      })),
    updateCustomEntryBullet: (sectionId, entryId, bulletId, text) =>
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        const entry = sec?.entries?.find(e => e.id === entryId);
        if (entry) {
          const bullet = entry.bullets.find(b => b.id === bulletId);
          if (bullet) bullet.text = text;
        }
      })),
    reorderCustomEntryBullets: (sectionId, entryId, from, to) =>
      setAndSave(produce((s: ResumeStore) => {
        const sec = s.data.customSections?.find(cs => cs.id === sectionId);
        const entry = sec?.entries?.find(e => e.id === entryId);
        if (entry) entry.bullets = reorder(entry.bullets, from, to);
      })),

    // Section Order
    moveSectionOrder: (from, to) =>
      setAndSave(produce((s: ResumeStore) => {
        if (!s.data.sectionOrder) return;
        s.data.sectionOrder = reorder(s.data.sectionOrder, from, to);
      })),

    // Summary
    updateSummary: (text) =>
      setAndSave(produce((s: ResumeStore) => { s.data.summary = text; })),

    // Section Gaps
    updateSectionGap: (sectionKey, gap) =>
      setAndSave(produce((s: ResumeStore) => {
        if (!s.data.sectionGaps) s.data.sectionGaps = {};
        s.data.sectionGaps[sectionKey] = gap;
      })),
    updateEntryGap: (entryId, gap) =>
      setAndSave(produce((s: ResumeStore) => {
        if (!s.data.entryGaps) s.data.entryGaps = {};
        s.data.entryGaps[entryId] = gap;
      })),

    // Formatting
    updateFormat: (key, value) =>
      setAndSave(produce((s: ResumeStore) => {
        if (!s.data.format) s.data.format = { ...DEFAULT_FORMAT };
        (s.data.format as Record<string, unknown>)[key as string] = value;
      })),
    resetFormat: () =>
      setAndSave(produce((s: ResumeStore) => { s.data.format = { ...DEFAULT_FORMAT }; })),

    // Layout
    updateLayout: (section, updates) =>
      setAndSave(produce((s: ResumeStore) => {
        if (!s.data.layout) s.data.layout = structuredClone(DEFAULT_LAYOUT);
        Object.assign(s.data.layout[section], updates);
      })),
    resetLayout: () =>
      setAndSave(produce((s: ResumeStore) => { s.data.layout = undefined; })),

    // Global
    loadData: (data) => {
      set({ data });
      debouncedSave(get);
    },
    resetToSample: () => {
      set({ data: sampleResume });
      debouncedSave(get);
    },
    flushSave: async () => {
      clearTimeout(saveTimer);
      const { mongoId, data } = get();
      if (mongoId) {
        await patchResume(mongoId, data as unknown as Record<string, unknown>);
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
    },
  };
});

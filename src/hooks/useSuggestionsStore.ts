import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Suggestion, SuggestionStatus } from '../types/suggestions';
import type { JDAnalysis } from '../types/jd';
import type { ProfileVault } from '../types/vault';
import type { ResumeData } from '../types/resume';
import { generateSuggestions } from '../api/suggestionsApi';
import { useResumeStore } from './useResumeStore';

interface SuggestionsStore {
  suggestions: Suggestion[];
  loading: boolean;
  error: string;

  generate: (jdAnalysis: JDAnalysis, vault: ProfileVault | null, resume: ResumeData) => Promise<void>;
  accept: (id: string) => void;
  reject: (id: string) => void;
  acceptAll: () => void;
  clear: () => void;
}

export const useSuggestionsStore = create<SuggestionsStore>((set, get) => ({
  suggestions: [],
  loading: false,
  error: '',

  generate: async (jdAnalysis, vault, resume) => {
    set({ loading: true, error: '', suggestions: [] });
    try {
      const result = await generateSuggestions(jdAnalysis, vault, resume);
      set({ suggestions: result, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  accept: (id) => {
    const { suggestions } = get();
    const sug = suggestions.find((s) => s.id === id);
    if (!sug || sug.status !== 'pending') return;

    applySuggestion(sug);
    set({ suggestions: suggestions.map((s) => s.id === id ? { ...s, status: 'accepted' as SuggestionStatus } : s) });
  },

  reject: (id) => {
    const { suggestions } = get();
    set({ suggestions: suggestions.map((s) => s.id === id ? { ...s, status: 'rejected' as SuggestionStatus } : s) });
  },

  acceptAll: () => {
    const { suggestions } = get();
    for (const sug of suggestions) {
      if (sug.status === 'pending') applySuggestion(sug);
    }
    set({ suggestions: suggestions.map((s) => s.status === 'pending' ? { ...s, status: 'accepted' as SuggestionStatus } : s) });
  },

  clear: () => set({ suggestions: [], error: '' }),
}));

function applySuggestion(sug: Suggestion) {
  const store = useResumeStore.getState();

  switch (sug.type) {
    case 'summary_rewrite': {
      store.updateSummary(sug.suggested);
      break;
    }
    case 'skill_add': {
      const row = store.data.skills.find((s) =>
        s.category.toLowerCase() === sug.category.toLowerCase()
      );
      if (row) {
        const current = row.skills.trim();
        const newSkills = current ? `${current}, ${sug.keyword}` : sug.keyword;
        store.updateSkillRow(row.id, 'skills', newSkills);
      } else {
        store.addSkillRow();
        const newRow = store.data.skills[store.data.skills.length - 1];
        if (newRow) {
          store.updateSkillRow(newRow.id, 'category', sug.category);
          store.updateSkillRow(newRow.id, 'skills', sug.keyword);
        }
      }
      break;
    }
    case 'skill_remove': {
      const row = store.data.skills.find((s) =>
        s.category.toLowerCase() === sug.category.toLowerCase()
      );
      if (row) {
        const skills = row.skills.split(',').map((s) => s.trim()).filter((s) =>
          s.toLowerCase() !== sug.keyword.toLowerCase()
        ).join(', ');
        store.updateSkillRow(row.id, 'skills', skills);
      }
      break;
    }
    case 'bullet_rephrase':
    case 'bullet_swap': {
      const list = sug.section === 'experience' ? store.data.experience : store.data.projects;
      const entry = list[sug.entryIndex];
      if (entry) {
        const bullet = entry.bullets[sug.bulletIndex];
        if (bullet) {
          store.updateBullet(entry.id, bullet.id, sug.suggested, sug.section);
        }
      }
      break;
    }
    case 'bullet_reorder': {
      const list = sug.section === 'experience' ? store.data.experience : store.data.projects;
      const entry = list[sug.entryIndex];
      if (entry && sug.suggestedOrder) {
        // Apply reordering by moving bullets one at a time
        for (let target = 0; target < sug.suggestedOrder.length; target++) {
          const from = sug.suggestedOrder[target];
          if (from !== target && from < entry.bullets.length) {
            store.reorderBullets(entry.id, from, target, sug.section);
          }
        }
      }
      break;
    }
    case 'project_swap': {
      const proj = store.data.projects[sug.removeIndex];
      if (proj) {
        store.updateProject(proj.id, 'title', sug.addTitle);
        store.updateProject(proj.id, 'techStack', sug.addTechStack);
        // Replace bullets
        for (const b of proj.bullets) {
          store.removeBullet(proj.id, b.id, 'projects');
        }
        for (const text of sug.addBullets) {
          const bulletId = store.addBullet(proj.id, 'projects');
          store.updateBullet(proj.id, bulletId, text, 'projects');
        }
      }
      break;
    }
    case 'project_add': {
      const projId = store.addProject();
      const proj = store.data.projects.find((p) => p.id === projId);
      if (proj) {
        store.updateProject(projId, 'title', sug.title);
        store.updateProject(projId, 'techStack', sug.techStack);
        for (const text of sug.bullets) {
          const bulletId = store.addBullet(projId, 'projects');
          store.updateBullet(projId, bulletId, text, 'projects');
        }
      }
      break;
    }
    case 'project_remove': {
      const proj = store.data.projects[sug.removeIndex];
      if (proj) store.removeProject(proj.id);
      break;
    }
  }
}

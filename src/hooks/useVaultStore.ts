import { create } from 'zustand';
import { produce } from 'immer';
import { nanoid } from 'nanoid';
import type { ProfileVault, VaultExperience, VaultProject, VaultBullet, BulletGroup, Certification, SummaryVariant, Extracurricular } from '../types/vault';
import type { ContactInfo, EducationEntry, SkillRow } from '../types/resume';
import { patchVault } from '../api/vaultApi';

export type VaultSection = 'contact' | 'education' | 'certifications' | 'summaries' | 'experience' | 'projects' | 'skills' | 'extracurriculars';

interface VaultStore {
  vault: ProfileVault | null;
  mongoId: string | null;
  loading: boolean;
  activeSection: VaultSection | null;

  setActiveSection: (section: VaultSection | null) => void;
  loadVault: (vault: ProfileVault) => void;
  clearVault: () => void;

  // Contact
  updateContact: <K extends keyof ContactInfo>(field: K, value: ContactInfo[K]) => void;

  // Education
  addEducation: () => void;
  removeEducation: (id: string) => void;
  updateEducation: <K extends keyof EducationEntry>(id: string, field: K, value: EducationEntry[K]) => void;

  // Certifications
  addCertification: () => void;
  removeCertification: (id: string) => void;
  updateCertification: <K extends keyof Certification>(id: string, field: K, value: Certification[K]) => void;

  // Summary Variants
  addSummaryVariant: () => void;
  removeSummaryVariant: (id: string) => void;
  updateSummaryVariant: <K extends keyof SummaryVariant>(id: string, field: K, value: SummaryVariant[K]) => void;

  // Experience
  addExperience: () => void;
  removeExperience: (id: string) => void;
  updateExperience: <K extends keyof VaultExperience>(id: string, field: K, value: VaultExperience[K]) => void;

  // Bullet Groups (for experience/projects)
  addBulletGroup: (parentId: string, section: 'experience' | 'projects') => void;
  removeBulletGroup: (parentId: string, groupId: string, section: 'experience' | 'projects') => void;
  updateBulletGroupTheme: (parentId: string, groupId: string, theme: string, section: 'experience' | 'projects') => void;

  // Vault Bullets
  addVaultBullet: (parentId: string, groupId: string, section: 'experience' | 'projects') => void;
  removeVaultBullet: (parentId: string, groupId: string, bulletId: string, section: 'experience' | 'projects') => void;
  updateVaultBullet: (parentId: string, groupId: string, bulletId: string, updates: Partial<VaultBullet>, section: 'experience' | 'projects') => void;

  // Projects
  addProject: () => void;
  removeProject: (id: string) => void;
  updateProject: <K extends keyof VaultProject>(id: string, field: K, value: VaultProject[K]) => void;

  // Skills
  addSkillRow: () => void;
  removeSkillRow: (id: string) => void;
  updateSkillRow: <K extends keyof SkillRow>(id: string, field: K, value: SkillRow[K]) => void;

  // Extracurriculars
  addExtracurricular: () => void;
  removeExtracurricular: (id: string) => void;
  updateExtracurricular: (id: string, text: string) => void;
}

// Debounced save to MongoDB
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function debouncedSave(getState: () => VaultStore) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { mongoId, vault } = getState();
    if (mongoId && vault) {
      const { _id, createdAt, updatedAt, ...data } = vault;
      patchVault(mongoId, data as unknown as Record<string, unknown>).catch(console.error);
    }
  }, 800);
}

export const useVaultStore = create<VaultStore>((set, get) => {
  const setAndSave = (updater: (vault: ProfileVault) => void) => {
    set(produce((s: VaultStore) => {
      if (s.vault) updater(s.vault);
    }));
    debouncedSave(get);
  };

  return {
    vault: null,
    mongoId: null,
    loading: true,
    activeSection: null,

    setActiveSection: (section) => set({ activeSection: section }),

    loadVault: (vault) => set({ vault, mongoId: vault._id || null, loading: false }),
    clearVault: () => set({ vault: null, mongoId: null }),

    // Contact
    updateContact: (field, value) => setAndSave((v) => {
      (v.contact as Record<string, unknown>)[field] = value;
    }),

    // Education
    addEducation: () => setAndSave((v) => {
      v.education.push({ id: `edu-${nanoid(6)}`, school: '', location: '', degree: '', gpa: '', dates: '', coursework: '' });
    }),
    removeEducation: (id) => setAndSave((v) => {
      v.education = v.education.filter((e) => e.id !== id);
    }),
    updateEducation: (id, field, value) => setAndSave((v) => {
      const entry = v.education.find((e) => e.id === id);
      if (entry) (entry as Record<string, unknown>)[field] = value;
    }),

    // Certifications
    addCertification: () => setAndSave((v) => {
      v.certifications.push({ id: `cert-${nanoid(6)}`, name: '', issuer: '', date: '' });
    }),
    removeCertification: (id) => setAndSave((v) => {
      v.certifications = v.certifications.filter((c) => c.id !== id);
    }),
    updateCertification: (id, field, value) => setAndSave((v) => {
      const entry = v.certifications.find((c) => c.id === id);
      if (entry) (entry as Record<string, unknown>)[field] = value;
    }),

    // Summary Variants
    addSummaryVariant: () => setAndSave((v) => {
      v.summaryVariants.push({ id: `sum-${nanoid(6)}`, label: '', text: '' });
    }),
    removeSummaryVariant: (id) => setAndSave((v) => {
      v.summaryVariants = v.summaryVariants.filter((s) => s.id !== id);
    }),
    updateSummaryVariant: (id, field, value) => setAndSave((v) => {
      const entry = v.summaryVariants.find((s) => s.id === id);
      if (entry) (entry as Record<string, unknown>)[field] = value;
    }),

    // Experience
    addExperience: () => setAndSave((v) => {
      v.experience.push({
        id: `exp-${nanoid(6)}`, company: '', location: '', role: '', dates: '', context: '',
        bulletGroups: [{ id: `bg-${nanoid(6)}`, theme: 'General', bullets: [] }],
      });
    }),
    removeExperience: (id) => setAndSave((v) => {
      v.experience = v.experience.filter((e) => e.id !== id);
    }),
    updateExperience: (id, field, value) => setAndSave((v) => {
      const entry = v.experience.find((e) => e.id === id);
      if (entry) (entry as Record<string, unknown>)[field] = value;
    }),

    // Bullet Groups
    addBulletGroup: (parentId, section) => setAndSave((v) => {
      const list = section === 'experience' ? v.experience : v.projects;
      const parent = list.find((e) => e.id === parentId);
      if (parent) parent.bulletGroups.push({ id: `bg-${nanoid(6)}`, theme: '', bullets: [] });
    }),
    removeBulletGroup: (parentId, groupId, section) => setAndSave((v) => {
      const list = section === 'experience' ? v.experience : v.projects;
      const parent = list.find((e) => e.id === parentId);
      if (parent) parent.bulletGroups = parent.bulletGroups.filter((g) => g.id !== groupId);
    }),
    updateBulletGroupTheme: (parentId, groupId, theme, section) => setAndSave((v) => {
      const list = section === 'experience' ? v.experience : v.projects;
      const parent = list.find((e) => e.id === parentId);
      const group = parent?.bulletGroups.find((g) => g.id === groupId);
      if (group) group.theme = theme;
    }),

    // Vault Bullets
    addVaultBullet: (parentId, groupId, section) => setAndSave((v) => {
      const list = section === 'experience' ? v.experience : v.projects;
      const parent = list.find((e) => e.id === parentId);
      const group = parent?.bulletGroups.find((g) => g.id === groupId);
      if (group) group.bullets.push({ id: `vb-${nanoid(6)}`, text: '', tags: [], metrics: [] });
    }),
    removeVaultBullet: (parentId, groupId, bulletId, section) => setAndSave((v) => {
      const list = section === 'experience' ? v.experience : v.projects;
      const parent = list.find((e) => e.id === parentId);
      const group = parent?.bulletGroups.find((g) => g.id === groupId);
      if (group) group.bullets = group.bullets.filter((b) => b.id !== bulletId);
    }),
    updateVaultBullet: (parentId, groupId, bulletId, updates, section) => setAndSave((v) => {
      const list = section === 'experience' ? v.experience : v.projects;
      const parent = list.find((e) => e.id === parentId);
      const group = parent?.bulletGroups.find((g) => g.id === groupId);
      const bullet = group?.bullets.find((b) => b.id === bulletId);
      if (bullet) Object.assign(bullet, updates);
    }),

    // Projects
    addProject: () => setAndSave((v) => {
      v.projects.push({
        id: `proj-${nanoid(6)}`, title: '', techStack: '', date: '', description: '', githubUrl: '',
        bulletGroups: [{ id: `bg-${nanoid(6)}`, theme: 'General', bullets: [] }],
      });
    }),
    removeProject: (id) => setAndSave((v) => {
      v.projects = v.projects.filter((p) => p.id !== id);
    }),
    updateProject: (id, field, value) => setAndSave((v) => {
      const entry = v.projects.find((p) => p.id === id);
      if (entry) (entry as Record<string, unknown>)[field] = value;
    }),

    // Skills
    addSkillRow: () => setAndSave((v) => {
      v.skills.push({ id: `sk-${nanoid(6)}`, category: '', skills: '' });
    }),
    removeSkillRow: (id) => setAndSave((v) => {
      v.skills = v.skills.filter((s) => s.id !== id);
    }),
    updateSkillRow: (id, field, value) => setAndSave((v) => {
      const entry = v.skills.find((s) => s.id === id);
      if (entry) (entry as Record<string, unknown>)[field] = value;
    }),

    // Extracurriculars
    addExtracurricular: () => setAndSave((v) => {
      v.extracurriculars.push({ id: `extra-${nanoid(6)}`, text: '' });
    }),
    removeExtracurricular: (id) => setAndSave((v) => {
      v.extracurriculars = v.extracurriculars.filter((e) => e.id !== id);
    }),
    updateExtracurricular: (id, text) => setAndSave((v) => {
      const entry = v.extracurriculars.find((e) => e.id === id);
      if (entry) entry.text = text;
    }),
  };
});

import { nanoid } from 'nanoid';
import type { TailorResult } from '../types/jd';
import type { ResumeData } from '../types/resume';

interface ResumeStoreMethods {
  updateSummary: (text: string) => void;
  updateSkillRow: (id: string, field: 'category' | 'skills', value: string) => void;
  addSkillRow: () => void;
  updateBullet: (parentId: string, bulletId: string, text: string, section: 'experience' | 'projects') => void;
  reorderBullets: (parentId: string, fromIndex: number, toIndex: number, section: 'experience' | 'projects') => void;
  removeBullet: (parentId: string, bulletId: string, section: 'experience' | 'projects') => void;
  insertBulletAfter: (parentId: string, afterBulletId: string, text: string, section: 'experience' | 'projects') => string;
  addProject: () => string;
  updateProject: (id: string, field: string, value: unknown) => void;
  addBullet: (parentId: string, section: 'experience' | 'projects') => string;
  removeProject: (id: string) => void;
}

/**
 * Apply accepted tailor changes to the resume store.
 * Returns a list of short descriptions of what was applied (for iteration tracking).
 */
export function applyTailorChanges(
  tailorResult: TailorResult,
  tailorAccepted: Record<string, boolean>,
  resumeData: ResumeData,
  store: ResumeStoreMethods,
  getLatestSkills: () => ResumeData['skills'],
): string[] {
  const applied: string[] = [];

  // Apply summary
  if (tailorAccepted['summary'] && tailorResult.summary) {
    store.updateSummary(tailorResult.summary);
    applied.push('Rewrote professional summary');
  }

  // Apply skills
  if (tailorAccepted['skills'] && tailorResult.skills) {
    for (const newSkill of tailorResult.skills) {
      const existing = resumeData.skills.find((s) => s.id === newSkill.id);
      if (existing) {
        if (existing.category !== newSkill.category) store.updateSkillRow(existing.id, 'category', newSkill.category);
        if (existing.skills !== newSkill.skills) store.updateSkillRow(existing.id, 'skills', newSkill.skills);
      } else {
        store.addSkillRow();
        const latestSkills = getLatestSkills();
        const addedRow = latestSkills[latestSkills.length - 1];
        if (addedRow) {
          store.updateSkillRow(addedRow.id, 'category', newSkill.category);
          store.updateSkillRow(addedRow.id, 'skills', newSkill.skills);
        }
      }
    }
    applied.push('Updated skills section');
  }

  // Apply bullet changes
  if (tailorResult.bulletChanges) {
    for (const bc of tailorResult.bulletChanges) {
      if (!tailorAccepted[bc.bulletId]) continue;
      store.updateBullet(bc.entryId, bc.bulletId, bc.revised, bc.section);
      applied.push(`Rephrased bullet in ${bc.section} ${bc.entryId}`);
    }
  }

  // Apply bullet reorders
  if (tailorResult.bulletReorders) {
    for (const br of tailorResult.bulletReorders) {
      if (!tailorAccepted[`reorder-${br.entryId}`]) continue;
      const entry = br.section === 'experience'
        ? resumeData.experience.find((e) => e.id === br.entryId)
        : resumeData.projects.find((p) => p.id === br.entryId);
      if (!entry) continue;

      const currentBullets = entry.bullets;
      for (let targetIdx = 0; targetIdx < br.bulletIds.length; targetIdx++) {
        const bulletId = br.bulletIds[targetIdx];
        const currentIdx = currentBullets.findIndex((b) => b.id === bulletId);
        if (currentIdx !== -1 && currentIdx !== targetIdx) {
          store.reorderBullets(br.entryId, currentIdx, targetIdx, br.section);
        }
      }
      applied.push(`Reordered bullets in ${br.section} ${br.entryId}`);
    }
  }

  // Apply bullet swaps (vault swaps)
  if (tailorResult.bulletSwaps) {
    for (const bs of tailorResult.bulletSwaps) {
      if (!tailorAccepted[`swap-${bs.removeBulletId}`]) continue;
      // Remove old bullet, insert new one in its place
      const entry = bs.section === 'experience'
        ? resumeData.experience.find((e) => e.id === bs.entryId)
        : resumeData.projects.find((p) => p.id === bs.entryId);
      if (!entry) continue;

      const bulletIdx = entry.bullets.findIndex((b) => b.id === bs.removeBulletId);
      if (bulletIdx === -1) continue;

      // Get the bullet before the one we're removing (for insert position)
      const prevBulletId = bulletIdx > 0 ? entry.bullets[bulletIdx - 1].id : null;

      store.removeBullet(bs.entryId, bs.removeBulletId, bs.section);
      if (prevBulletId) {
        store.insertBulletAfter(bs.entryId, prevBulletId, bs.addBulletText, bs.section);
      } else {
        // Was first bullet - add and reorder to front
        const newId = store.addBullet(bs.entryId, bs.section);
        store.updateBullet(bs.entryId, newId, bs.addBulletText, bs.section);
      }
      applied.push(`Swapped bullet from vault (${bs.vaultSource})`);
    }
  }

  // Apply project swaps
  if (tailorResult.projectSwaps) {
    // Remove projects
    if (tailorResult.projectSwaps.remove) {
      for (const projId of tailorResult.projectSwaps.remove) {
        if (!tailorAccepted[`remove-proj-${projId}`]) continue;
        store.removeProject(projId);
        applied.push(`Removed project ${projId}`);
      }
    }

    // Add projects
    if (tailorResult.projectSwaps.add) {
      for (let i = 0; i < tailorResult.projectSwaps.add.length; i++) {
        const proj = tailorResult.projectSwaps.add[i];
        if (!tailorAccepted[`add-proj-${i}`]) continue;
        const newId = store.addProject();
        store.updateProject(newId, 'title', proj.title);
        if (proj.techStack) store.updateProject(newId, 'techStack', proj.techStack);
        if (proj.date) store.updateProject(newId, 'date', proj.date);
        for (const bulletText of (proj.bullets || [])) {
          const bulletId = store.addBullet(newId, 'projects');
          store.updateBullet(newId, bulletId, bulletText, 'projects');
        }
        applied.push(`Added project: ${proj.title}`);
      }
    }
  }

  return applied;
}

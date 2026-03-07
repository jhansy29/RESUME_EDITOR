import { useVaultStore } from '../../hooks/useVaultStore';
import type { VaultExperience, BulletGroup, VaultBullet } from '../../types/vault';

function BulletEditor({
  bullet,
  parentId,
  groupId,
  section,
}: {
  bullet: VaultBullet;
  parentId: string;
  groupId: string;
  section: 'experience' | 'projects';
}) {
  const update = useVaultStore((s) => s.updateVaultBullet);
  const remove = useVaultStore((s) => s.removeVaultBullet);

  return (
    <div className="vault-bullet">
      <textarea
        className="vault-bullet-text"
        value={bullet.text}
        onChange={(e) => update(parentId, groupId, bullet.id, { text: e.target.value }, section)}
        placeholder="Bullet text..."
        rows={2}
      />
      <div className="vault-bullet-meta">
        <input
          className="vault-tags-input"
          value={bullet.tags.join(', ')}
          onChange={(e) => update(parentId, groupId, bullet.id, { tags: e.target.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) }, section)}
          placeholder="Tags: python, fastapi, aws..."
        />
        <input
          className="vault-metrics-input"
          value={bullet.metrics.join(', ')}
          onChange={(e) => update(parentId, groupId, bullet.id, { metrics: e.target.value.split(',').map((m) => m.trim()).filter(Boolean) }, section)}
          placeholder="Metrics: 91% accuracy, 50K+ records..."
        />
      </div>
      <button className="bullet-remove" onClick={() => remove(parentId, groupId, bullet.id, section)} title="Remove bullet">&times;</button>
    </div>
  );
}

function BulletGroupEditor({
  group,
  parentId,
  section,
}: {
  group: BulletGroup;
  parentId: string;
  section: 'experience' | 'projects';
}) {
  const updateTheme = useVaultStore((s) => s.updateBulletGroupTheme);
  const removeGroup = useVaultStore((s) => s.removeBulletGroup);
  const addBullet = useVaultStore((s) => s.addVaultBullet);

  return (
    <div className="vault-bullet-group">
      <div className="vault-group-header">
        <input
          className="vault-theme-input"
          value={group.theme}
          onChange={(e) => updateTheme(parentId, group.id, e.target.value, section)}
          placeholder="Theme (e.g. Backend, ML Pipeline)"
        />
        <button className="entry-remove" onClick={() => removeGroup(parentId, group.id, section)}>Remove Group</button>
      </div>
      {group.bullets.map((b) => (
        <BulletEditor key={b.id} bullet={b} parentId={parentId} groupId={group.id} section={section} />
      ))}
      <button className="add-bullet-btn" onClick={() => addBullet(parentId, group.id, section)}>
        + Add Bullet
      </button>
    </div>
  );
}

function ExperienceCard({ exp }: { exp: VaultExperience }) {
  const remove = useVaultStore((s) => s.removeExperience);
  const update = useVaultStore((s) => s.updateExperience);
  const addGroup = useVaultStore((s) => s.addBulletGroup);

  return (
    <div className="entry-card vault-entry-card">
      <div className="entry-card-header">
        <strong>{exp.company || 'New Experience'}</strong>
        <button className="entry-remove" onClick={() => remove(exp.id)}>Remove</button>
      </div>
      <div className="field-row">
        <div className="field-group">
          <label className="field-label">Company</label>
          <input className="field-input" value={exp.company} onChange={(e) => update(exp.id, 'company', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Location</label>
          <input className="field-input" value={exp.location} onChange={(e) => update(exp.id, 'location', e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field-group">
          <label className="field-label">Role</label>
          <input className="field-input" value={exp.role} onChange={(e) => update(exp.id, 'role', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Dates</label>
          <input className="field-input" value={exp.dates} onChange={(e) => update(exp.id, 'dates', e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field-group" style={{ flex: 1 }}>
          <label className="field-label">Context</label>
          <input className="field-input" value={exp.context} onChange={(e) => update(exp.id, 'context', e.target.value)} placeholder="Brief company/role context" />
        </div>
      </div>
      <div className="vault-bullet-groups">
        <label className="field-label">Bullet Groups</label>
        {exp.bulletGroups.map((g) => (
          <BulletGroupEditor key={g.id} group={g} parentId={exp.id} section="experience" />
        ))}
        <button className="add-bullet-btn" onClick={() => addGroup(exp.id, 'experience')}>
          + Add Bullet Group
        </button>
      </div>
    </div>
  );
}

export function VaultExperienceEditor() {
  const experience = useVaultStore((s) => s.vault?.experience ?? []);
  const add = useVaultStore((s) => s.addExperience);

  return (
    <div className="form-section">
      <div className="form-section-title">
        Experience
        <button onClick={add}>+ Add Experience</button>
      </div>
      {experience.map((exp) => (
        <ExperienceCard key={exp.id} exp={exp} />
      ))}
    </div>
  );
}

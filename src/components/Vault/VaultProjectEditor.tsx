import { useVaultStore } from '../../hooks/useVaultStore';
import type { VaultProject, BulletGroup, VaultBullet } from '../../types/vault';

function BulletEditor({
  bullet,
  parentId,
  groupId,
}: {
  bullet: VaultBullet;
  parentId: string;
  groupId: string;
}) {
  const update = useVaultStore((s) => s.updateVaultBullet);
  const remove = useVaultStore((s) => s.removeVaultBullet);

  return (
    <div className="vault-bullet">
      <textarea
        className="vault-bullet-text"
        value={bullet.text}
        onChange={(e) => update(parentId, groupId, bullet.id, { text: e.target.value }, 'projects')}
        placeholder="Bullet text..."
        rows={2}
      />
      <div className="vault-bullet-meta">
        <input
          className="vault-tags-input"
          value={bullet.tags.join(', ')}
          onChange={(e) => update(parentId, groupId, bullet.id, { tags: e.target.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) }, 'projects')}
          placeholder="Tags: react, tensorflow, docker..."
        />
        <input
          className="vault-metrics-input"
          value={bullet.metrics.join(', ')}
          onChange={(e) => update(parentId, groupId, bullet.id, { metrics: e.target.value.split(',').map((m) => m.trim()).filter(Boolean) }, 'projects')}
          placeholder="Metrics: 30K+ trials, 80% reduction..."
        />
      </div>
      <button className="bullet-remove" onClick={() => remove(parentId, groupId, bullet.id, 'projects')} title="Remove bullet">&times;</button>
    </div>
  );
}

function BulletGroupEditor({
  group,
  parentId,
}: {
  group: BulletGroup;
  parentId: string;
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
          onChange={(e) => updateTheme(parentId, group.id, e.target.value, 'projects')}
          placeholder="Theme (e.g. ML Pipeline, Frontend)"
        />
        <button className="entry-remove" onClick={() => removeGroup(parentId, group.id, 'projects')}>Remove Group</button>
      </div>
      {group.bullets.map((b) => (
        <BulletEditor key={b.id} bullet={b} parentId={parentId} groupId={group.id} />
      ))}
      <button className="add-bullet-btn" onClick={() => addBullet(parentId, group.id, 'projects')}>
        + Add Bullet
      </button>
    </div>
  );
}

function ProjectCard({ project }: { project: VaultProject }) {
  const remove = useVaultStore((s) => s.removeProject);
  const update = useVaultStore((s) => s.updateProject);
  const addGroup = useVaultStore((s) => s.addBulletGroup);

  return (
    <div className="entry-card vault-entry-card">
      <div className="entry-card-header">
        <strong>{project.title || 'New Project'}</strong>
        <button className="entry-remove" onClick={() => remove(project.id)}>Remove</button>
      </div>
      <div className="field-row">
        <div className="field-group">
          <label className="field-label">Title</label>
          <input className="field-input" value={project.title} onChange={(e) => update(project.id, 'title', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Date</label>
          <input className="field-input" value={project.date} onChange={(e) => update(project.id, 'date', e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field-group">
          <label className="field-label">Tech Stack</label>
          <input className="field-input" value={project.techStack} onChange={(e) => update(project.id, 'techStack', e.target.value)} placeholder="Python, React, AWS..." />
        </div>
        <div className="field-group">
          <label className="field-label">GitHub URL</label>
          <input className="field-input" value={project.githubUrl} onChange={(e) => update(project.id, 'githubUrl', e.target.value)} placeholder="https://github.com/..." />
        </div>
      </div>
      <div className="field-row">
        <div className="field-group" style={{ flex: 1 }}>
          <label className="field-label">Description</label>
          <textarea className="field-input" value={project.description} onChange={(e) => update(project.id, 'description', e.target.value)} placeholder="Brief project description" rows={2} />
        </div>
      </div>
      <div className="vault-bullet-groups">
        <label className="field-label">Bullet Groups</label>
        {project.bulletGroups.map((g) => (
          <BulletGroupEditor key={g.id} group={g} parentId={project.id} />
        ))}
        <button className="add-bullet-btn" onClick={() => addGroup(project.id, 'projects')}>
          + Add Bullet Group
        </button>
      </div>
    </div>
  );
}

export function VaultProjectEditor() {
  const projects = useVaultStore((s) => s.vault?.projects ?? []);
  const add = useVaultStore((s) => s.addProject);

  return (
    <div className="form-section">
      <div className="form-section-title">
        Projects
        <button onClick={add}>+ Add Project</button>
      </div>
      {projects.map((proj) => (
        <ProjectCard key={proj.id} project={proj} />
      ))}
    </div>
  );
}

import { useResumeStore } from '../../hooks/useResumeStore';
import { BulletInput } from './BulletInput';
import { SortableList } from './SortableList';
import type { ProjectEntry } from '../../types/resume';

function ProjectCard({
  proj,
  dragListeners,
}: {
  proj: ProjectEntry;
  dragListeners?: Record<string, unknown>;
}) {
  const remove = useResumeStore((s) => s.removeProject);
  const update = useResumeStore((s) => s.updateProject);
  const addBullet = useResumeStore((s) => s.addBullet);
  const removeBullet = useResumeStore((s) => s.removeBullet);
  const updateBullet = useResumeStore((s) => s.updateBullet);
  const reorderBullets = useResumeStore((s) => s.reorderBullets);

  return (
    <div className="entry-card">
      <div className="entry-card-header">
        <span className="drag-handle" {...dragListeners}>⠿</span>
        <button className="entry-remove" onClick={() => remove(proj.id)}>Remove</button>
      </div>
      <div className="field-row">
        <div className="field-group" style={{ flex: 2 }}>
          <label className="field-label">Title</label>
          <input className="field-input" value={proj.title} onChange={(e) => update(proj.id, 'title', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Date</label>
          <input className="field-input" value={proj.date || ''} onChange={(e) => update(proj.id, 'date', e.target.value)} />
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">Tech Stack</label>
        <input className="field-input" value={proj.techStack || ''} onChange={(e) => update(proj.id, 'techStack', e.target.value)} placeholder="Python, PyTorch, AWS" />
      </div>
      <div style={{ marginTop: 8 }}>
        <label className="field-label">Bullets</label>
        <SortableList items={proj.bullets} onReorder={(from, to) => reorderBullets(proj.id, from, to, 'projects')}>
          {proj.bullets.map((b) => (
            <BulletInput
              key={b.id}
              text={b.text}
              onChange={(text) => updateBullet(proj.id, b.id, text, 'projects')}
              onRemove={() => removeBullet(proj.id, b.id, 'projects')}
            />
          ))}
        </SortableList>
        <button className="add-bullet-btn" onClick={() => addBullet(proj.id, 'projects')}>
          + Add Bullet
        </button>
      </div>
    </div>
  );
}

export function ProjectsForm() {
  const entries = useResumeStore((s) => s.data.projects);
  const add = useResumeStore((s) => s.addProject);
  const reorder = useResumeStore((s) => s.reorderProjects);

  return (
    <div className="form-section">
      <div className="form-section-title">
        Projects
        <button onClick={add}>+ Add</button>
      </div>
      <SortableList items={entries} onReorder={reorder}>
        {entries.map((proj) => (
          <ProjectCard key={proj.id} proj={proj} />
        ))}
      </SortableList>
    </div>
  );
}

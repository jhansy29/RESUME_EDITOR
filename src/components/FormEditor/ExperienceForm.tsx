import { useResumeStore } from '../../hooks/useResumeStore';
import { BulletInput } from './BulletInput';
import { SortableList } from './SortableList';
import type { ExperienceEntry } from '../../types/resume';

function ExperienceCard({
  exp,
  dragListeners,
}: {
  exp: ExperienceEntry;
  dragListeners?: Record<string, unknown>;
}) {
  const remove = useResumeStore((s) => s.removeExperience);
  const update = useResumeStore((s) => s.updateExperience);
  const addBullet = useResumeStore((s) => s.addBullet);
  const removeBullet = useResumeStore((s) => s.removeBullet);
  const updateBullet = useResumeStore((s) => s.updateBullet);
  const reorderBullets = useResumeStore((s) => s.reorderBullets);

  return (
    <div className="entry-card">
      <div className="entry-card-header">
        <span className="drag-handle" {...dragListeners}>⠿</span>
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
      <div style={{ marginTop: 8 }}>
        <label className="field-label">Bullets</label>
        <SortableList items={exp.bullets} onReorder={(from, to) => reorderBullets(exp.id, from, to, 'experience')}>
          {exp.bullets.map((b) => (
            <BulletInput
              key={b.id}
              text={b.text}
              onChange={(text) => updateBullet(exp.id, b.id, text, 'experience')}
              onRemove={() => removeBullet(exp.id, b.id, 'experience')}
            />
          ))}
        </SortableList>
        <button className="add-bullet-btn" onClick={() => addBullet(exp.id, 'experience')}>
          + Add Bullet
        </button>
      </div>
    </div>
  );
}

export function ExperienceForm() {
  const entries = useResumeStore((s) => s.data.experience);
  const add = useResumeStore((s) => s.addExperience);
  const reorder = useResumeStore((s) => s.reorderExperience);

  return (
    <div className="form-section">
      <div className="form-section-title">
        Experience
        <button onClick={add}>+ Add</button>
      </div>
      <SortableList items={entries} onReorder={reorder}>
        {entries.map((exp) => (
          <ExperienceCard key={exp.id} exp={exp} />
        ))}
      </SortableList>
    </div>
  );
}

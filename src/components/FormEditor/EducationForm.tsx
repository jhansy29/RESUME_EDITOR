import { useResumeStore } from '../../hooks/useResumeStore';
import { SortableList } from './SortableList';
import type { EducationEntry } from '../../types/resume';

function EducationCard({
  edu,
  dragListeners,
}: {
  edu: EducationEntry;
  dragListeners?: Record<string, unknown>;
}) {
  const remove = useResumeStore((s) => s.removeEducation);
  const update = useResumeStore((s) => s.updateEducation);

  return (
    <div className="entry-card">
      <div className="entry-card-header">
        <span className="drag-handle" {...dragListeners}>⠿</span>
        <button className="entry-remove" onClick={() => remove(edu.id)}>Remove</button>
      </div>
      <div className="field-row">
        <div className="field-group">
          <label className="field-label">School</label>
          <input className="field-input" value={edu.school} onChange={(e) => update(edu.id, 'school', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Location</label>
          <input className="field-input" value={edu.location} onChange={(e) => update(edu.id, 'location', e.target.value)} />
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">Degree</label>
        <input className="field-input" value={edu.degree} onChange={(e) => update(edu.id, 'degree', e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field-group">
          <label className="field-label">GPA</label>
          <input className="field-input" value={edu.gpa || ''} onChange={(e) => update(edu.id, 'gpa', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Dates</label>
          <input className="field-input" value={edu.dates} onChange={(e) => update(edu.id, 'dates', e.target.value)} />
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">Coursework</label>
        <input className="field-input" value={edu.coursework || ''} onChange={(e) => update(edu.id, 'coursework', e.target.value)} />
      </div>
    </div>
  );
}

export function EducationForm() {
  const entries = useResumeStore((s) => s.data.education);
  const add = useResumeStore((s) => s.addEducation);
  const reorder = useResumeStore((s) => s.reorderEducation);

  return (
    <div className="form-section">
      <div className="form-section-title">
        Education
        <button onClick={add}>+ Add</button>
      </div>
      <SortableList items={entries} onReorder={reorder}>
        {entries.map((edu) => (
          <EducationCard key={edu.id} edu={edu} />
        ))}
      </SortableList>
    </div>
  );
}

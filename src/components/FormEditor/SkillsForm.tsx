import { useResumeStore } from '../../hooks/useResumeStore';
import { SortableList } from './SortableList';
import type { SkillRow } from '../../types/resume';

function SkillRowEditor({
  row,
  dragListeners,
}: {
  row: SkillRow;
  dragListeners?: Record<string, unknown>;
}) {
  const remove = useResumeStore((s) => s.removeSkillRow);
  const update = useResumeStore((s) => s.updateSkillRow);

  return (
    <div className="skill-row-editor">
      <span className="drag-handle" {...dragListeners}>⠿</span>
      <div className="skill-fields">
        <input
          className="field-input skill-category-input"
          value={row.category}
          onChange={(e) => update(row.id, 'category', e.target.value)}
          placeholder="Category"
        />
        <textarea
          className="field-input skill-values-input"
          value={row.skills}
          onChange={(e) => update(row.id, 'skills', e.target.value)}
          placeholder="Skill1, Skill2, Skill3"
          rows={2}
        />
      </div>
      <button className="bullet-remove" onClick={() => remove(row.id)} title="Remove row">×</button>
    </div>
  );
}

export function SkillsForm() {
  const rows = useResumeStore((s) => s.data.skills);
  const add = useResumeStore((s) => s.addSkillRow);
  const reorder = useResumeStore((s) => s.reorderSkills);

  return (
    <div className="form-section">
      <div className="form-section-title">
        Skills
        <button onClick={add}>+ Add Row</button>
      </div>
      <SortableList items={rows} onReorder={reorder}>
        {rows.map((row) => (
          <SkillRowEditor key={row.id} row={row} />
        ))}
      </SortableList>
    </div>
  );
}

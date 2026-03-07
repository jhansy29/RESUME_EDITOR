import { useVaultStore } from '../../hooks/useVaultStore';
import type { SkillRow } from '../../types/resume';

function SkillRowEditor({ row }: { row: SkillRow }) {
  const remove = useVaultStore((s) => s.removeSkillRow);
  const update = useVaultStore((s) => s.updateSkillRow);

  return (
    <div className="skill-row-editor">
      <input
        className="field-input skill-category-input"
        value={row.category}
        onChange={(e) => update(row.id, 'category', e.target.value)}
        placeholder="Category"
      />
      <input
        className="field-input skill-values-input"
        value={row.skills}
        onChange={(e) => update(row.id, 'skills', e.target.value)}
        placeholder="Skill1, Skill2, Skill3"
      />
      <button className="bullet-remove" onClick={() => remove(row.id)} title="Remove row">&times;</button>
    </div>
  );
}

export function VaultSkillsEditor() {
  const skills = useVaultStore((s) => s.vault?.skills ?? []);
  const add = useVaultStore((s) => s.addSkillRow);

  return (
    <div className="form-section">
      <div className="form-section-title">
        Skills
        <button onClick={add}>+ Add Row</button>
      </div>
      {skills.map((row) => (
        <SkillRowEditor key={row.id} row={row} />
      ))}
    </div>
  );
}

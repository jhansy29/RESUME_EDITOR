import { useResumeStore } from '../../hooks/useResumeStore';
import { EditableText } from './EditableText';
import { DEFAULT_LAYOUT } from '../../types/resume';
import type { SkillRow, SkillsLayout } from '../../types/resume';

interface Props {
  rows: SkillRow[];
  layout?: SkillsLayout;
}

export function SkillsSection({ rows, layout }: Props) {
  const updateSkillRow = useResumeStore((s) => s.updateSkillRow);
  const lo = layout ?? DEFAULT_LAYOUT.skills;

  const alignMode = lo.alignMode ?? 'inline';
  const sectionClass = [
    'skills-section',
    lo.displayMode === 'grid' ? 'skills-grid' : '',
    alignMode === 'aligned' ? 'skills-aligned' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={sectionClass}>
      {rows.map((row) => (
        <div key={row.id} className={`skill-row${lo.showBulletMarker ? '' : ' no-bullet'}`}>
          {alignMode === 'aligned' ? (
            <>
              <div className="skill-category-cell">
                {lo.showCategories && (
                  <EditableText className="skill-category" value={row.category} onSave={(v) => updateSkillRow(row.id, 'category', v)} placeholder="Category" />
                )}
              </div>
              <EditableText className="skill-values" value={row.skills} onSave={(v) => updateSkillRow(row.id, 'skills', v)} placeholder="Skills" />
            </>
          ) : (
            <>
              {lo.showCategories && (
                <span className="skill-category-cell">
                  <EditableText className="skill-category" value={row.category} onSave={(v) => updateSkillRow(row.id, 'category', v)} placeholder="Category" />
                </span>
              )}
              <EditableText className="skill-values" value={row.skills} onSave={(v) => updateSkillRow(row.id, 'skills', v)} placeholder="Skills" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

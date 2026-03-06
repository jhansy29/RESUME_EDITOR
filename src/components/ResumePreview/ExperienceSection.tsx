import { useResumeStore } from '../../hooks/useResumeStore';
import { EditableText } from './EditableText';
import { LayoutRow } from './LayoutRow';
import { filterRowSegments } from '../../utils/filterRowSegments';
import { DEFAULT_LAYOUT } from '../../types/resume';
import type { ExperienceEntry, SectionEntryLayout, RowSegment } from '../../types/resume';

interface Props {
  entries: ExperienceEntry[];
  bulletStyle?: React.CSSProperties;
  layout?: SectionEntryLayout;
}

const EXP_FIELDS: Record<string, { placeholder: string; defaultClass: string }> = {
  company: { placeholder: 'Company', defaultClass: 'entry-company' },
  location: { placeholder: 'Location', defaultClass: 'entry-location' },
  role: { placeholder: 'Role', defaultClass: 'entry-role' },
  dates: { placeholder: 'Dates', defaultClass: 'entry-dates' },
};

export function ExperienceSection({ entries, bulletStyle, layout }: Props) {
  const updateExperience = useResumeStore((s) => s.updateExperience);
  const updateBullet = useResumeStore((s) => s.updateBullet);
  const lo = layout ?? DEFAULT_LAYOUT.experience;

  return (
    <div>
      {entries.map((exp) => {
        const values: Record<string, string> = {
          company: exp.company || '',
          location: exp.location || '',
          role: exp.role || '',
          dates: exp.dates || '',
        };

        return (
          <div key={exp.id} className={`entry${lo.showEntryBulletMarker ? '' : ' no-bullet'}`}>
            {lo.showEntryBulletMarker && <div className="entry-bullet">{'\u2022'}</div>}
            <div className="entry-content">
              {lo.rows.map((row, rowIdx) => {
                const filtered = filterRowSegments(row, values);
                if (!filtered) return null;

                return (
                  <LayoutRow
                    key={rowIdx}
                    sectionKey="experience"
                    rowIdx={rowIdx}
                    row={filtered}
                    allRows={lo.rows}
                    className="entry-row"
                    renderSegment={(seg: RowSegment, segIdx: number, gapStyle?: React.CSSProperties) => {
                      if (seg.type === 'spacer') {
                        return <div key={`spacer-${segIdx}`} className="row-spacer" />;
                      }
                      if (seg.type === 'literal') {
                        return <span key={seg.value} className={seg.className} style={gapStyle}>{seg.value}</span>;
                      }
                      const fieldDef = EXP_FIELDS[seg.value];
                      if (!fieldDef) return null;

                      const value = values[seg.value];
                      const isBold = lo.boldField === seg.value;
                      const isItalic = lo.italicField === seg.value;
                      const cls = `${seg.className || fieldDef.defaultClass}${isBold ? ' field-bold' : ''}${isItalic ? ' field-italic' : ''}`;

                      return (
                        <EditableText
                          key={seg.value}
                          className={cls}
                          style={gapStyle}
                          value={value}
                          onSave={(v) => updateExperience(exp.id, seg.value as keyof ExperienceEntry, v)}
                          placeholder={fieldDef.placeholder}
                        />
                      );
                    }}
                  />
                );
              })}
              {exp.bullets.length > 0 && (
                <ul className="bullet-list" style={bulletStyle}>
                  {exp.bullets.map((b) => (
                    <EditableText key={b.id} tag="li" value={b.text} onSave={(v) => updateBullet(exp.id, b.id, v, 'experience')} placeholder="Bullet point" />
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

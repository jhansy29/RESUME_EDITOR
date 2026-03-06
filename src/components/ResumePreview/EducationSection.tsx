import { useResumeStore } from '../../hooks/useResumeStore';
import { EditableText } from './EditableText';
import { LayoutRow } from './LayoutRow';
import { filterRowSegments } from '../../utils/filterRowSegments';
import { DEFAULT_LAYOUT } from '../../types/resume';
import type { EducationEntry, EducationSectionLayout } from '../../types/resume';

interface Props {
  entries: EducationEntry[];
  layout?: EducationSectionLayout;
}

const EDU_FIELDS: Record<string, { placeholder: string; defaultClass: string }> = {
  school: { placeholder: 'School', defaultClass: 'edu-school' },
  location: { placeholder: 'Location', defaultClass: 'edu-location' },
  degree: { placeholder: 'Degree', defaultClass: 'edu-degree' },
  gpa: { placeholder: 'GPA', defaultClass: 'edu-gpa' },
  dates: { placeholder: 'Dates', defaultClass: 'edu-dates' },
  coursework: { placeholder: 'Coursework', defaultClass: 'edu-coursework' },
};

export function EducationSection({ entries, layout }: Props) {
  const updateEducation = useResumeStore((s) => s.updateEducation);
  const lo = layout ?? DEFAULT_LAYOUT.education;

  return (
    <div>
      {entries.map((edu) => {
        // Build a flat values map for filtering
        const values: Record<string, string> = {
          school: edu.school || '',
          location: edu.location || '',
          degree: edu.degree || '',
          gpa: edu.gpa ?? '',
          dates: edu.dates || '',
          coursework: (!lo.showCoursework ? '' : edu.coursework ?? ''),
        };

        return (
          <div key={edu.id} className={`edu-entry${lo.showEntryBulletMarker ? '' : ' no-bullet'}`}>
            {lo.showEntryBulletMarker && <div className="edu-bullet">{'\u2022'}</div>}
            <div className="edu-content">
              {lo.rows.map((row, rowIdx) => {
                const filtered = filterRowSegments(row, values);
                if (!filtered) return null;

                return (
                  <LayoutRow
                    key={rowIdx}
                    sectionKey="education"
                    rowIdx={rowIdx}
                    row={filtered}
                    allRows={lo.rows}
                    className={`edu-row-${rowIdx + 1}`}
                    renderSegment={(seg, segIdx, gapStyle) => {
                      if (seg.type === 'spacer') {
                        return <div key={`spacer-${segIdx}`} className="row-spacer" />;
                      }
                      if (seg.type === 'literal') {
                        return <span key={seg.value} className={seg.className} style={gapStyle}>{seg.value}</span>;
                      }
                      const fieldDef = EDU_FIELDS[seg.value];
                      if (!fieldDef) return null;

                      const value = values[seg.value];
                      const isBold = lo.boldField === seg.value;
                      const isItalic = lo.italicField === seg.value;
                      const cls = `${seg.className || fieldDef.defaultClass}${isBold ? ' field-bold' : ''}${isItalic ? ' field-italic' : ''}`;

                      if (seg.value === 'coursework') {
                        return (
                          <EditableText
                            key={seg.value}
                            tag="div"
                            className={cls}
                            style={gapStyle}
                            value={value ? `Courses: ${value}` : ''}
                            onSave={(v) => updateEducation(edu.id, 'coursework', v.replace(/^Courses:\s*/i, ''))}
                            placeholder="Coursework"
                          />
                        );
                      }

                      return (
                        <EditableText
                          key={seg.value}
                          className={cls}
                          style={gapStyle}
                          value={value}
                          onSave={(v) => updateEducation(edu.id, seg.value as keyof EducationEntry, v)}
                          placeholder={fieldDef.placeholder}
                        />
                      );
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { EditableText } from './EditableText';
import { GapHandle } from './GapHandle';
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
  const entryGaps = useResumeStore((s) => s.data.entryGaps);
  const bulletSpacing = useResumeStore((s) => s.data.format?.bulletSpacing ?? 0);
  const updateEntryGap = useResumeStore((s) => s.updateEntryGap);
  const lo = layout ?? DEFAULT_LAYOUT.education;

  return (
    <div>
      {entries.map((edu, idx) => {
        // Build a flat values map for filtering
        const values: Record<string, string> = {
          school: edu.school || '',
          location: edu.location || '',
          degree: edu.degree || '',
          gpa: edu.gpa ?? '',
          dates: edu.dates || '',
          coursework: (!lo.showCoursework ? '' : edu.coursework ?? ''),
        };

        const entryGap = entryGaps?.[edu.id] ?? bulletSpacing;

        return (
          <React.Fragment key={edu.id}>
            {idx > 0 && (
              <GapHandle
                gap={entryGap}
                defaultGap={bulletSpacing}
                onChange={(newGap) => updateEntryGap(edu.id, newGap)}
              />
            )}
            <div className={`edu-entry${lo.showEntryBulletMarker ? '' : ' no-bullet'}`} style={idx > 0 ? { marginTop: `${entryGap}pt` } : undefined}>
              {lo.showEntryBulletMarker && <div className="edu-bullet">{'\u2022'}</div>}
            <div className="edu-content">
              {(() => {
                const visibleRows = lo.rows
                  .map((row, rowIdx) => ({ row, rowIdx, filtered: filterRowSegments(row, values) }))
                  .filter((r): r is typeof r & { filtered: NonNullable<typeof r.filtered> } => r.filtered !== null);

                return visibleRows.map(({ rowIdx, filtered }, visIdx) => {
                  const rowGapKey = `${edu.id}-row-${rowIdx}`;
                  const rowGap = entryGaps?.[rowGapKey] ?? 0;
                  return (
                    <React.Fragment key={rowIdx}>
                      {visIdx > 0 && (
                        <GapHandle
                          gap={rowGap}
                          defaultGap={0}
                          onChange={(newGap) => updateEntryGap(rowGapKey, newGap)}
                        />
                      )}
                      <LayoutRow
                        sectionKey="education"
                        rowIdx={rowIdx}
                        row={filtered}
                        allRows={lo.rows}
                        className={`edu-row-${rowIdx + 1}`}
                        style={visIdx > 0 && rowGap !== 0 ? { marginTop: `${rowGap}pt` } : undefined}
                        entryId={edu.id}
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
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

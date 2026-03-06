import React from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { EditableText } from './EditableText';
import { GapHandle } from './GapHandle';
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
  const entryGaps = useResumeStore((s) => s.data.entryGaps);
  const bulletSpacing = useResumeStore((s) => s.data.format?.bulletSpacing ?? 0);
  const updateEntryGap = useResumeStore((s) => s.updateEntryGap);
  const lo = layout ?? DEFAULT_LAYOUT.experience;

  return (
    <div>
      {entries.map((exp, idx) => {
        const values: Record<string, string> = {
          company: exp.company || '',
          location: exp.location || '',
          role: exp.role || '',
          dates: exp.dates || '',
        };

        const entryGap = entryGaps?.[exp.id] ?? bulletSpacing;

        return (
          <React.Fragment key={exp.id}>
            {idx > 0 && (
              <GapHandle
                gap={entryGap}
                defaultGap={bulletSpacing}
                onChange={(newGap) => updateEntryGap(exp.id, newGap)}
              />
            )}
            <div className={`entry${lo.showEntryBulletMarker ? '' : ' no-bullet'}`} style={idx > 0 ? { marginTop: `${entryGap}pt` } : undefined}>
              {lo.showEntryBulletMarker && <div className="entry-bullet">{'\u2022'}</div>}
              <div className="entry-content">
              {(() => {
                const visibleRows = lo.rows
                  .map((row, rowIdx) => ({ row, rowIdx, filtered: filterRowSegments(row, values) }))
                  .filter((r): r is typeof r & { filtered: NonNullable<typeof r.filtered> } => r.filtered !== null);

                return visibleRows.map(({ rowIdx, filtered }, visIdx) => {
                  const rowGapKey = `${exp.id}-row-${rowIdx}`;
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
                        sectionKey="experience"
                        rowIdx={rowIdx}
                        row={filtered}
                        allRows={lo.rows}
                        className="entry-row"
                        style={visIdx > 0 && rowGap !== 0 ? { marginTop: `${rowGap}pt` } : undefined}
                        entryId={exp.id}
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
                    </React.Fragment>
                  );
                });
              })()}
              {exp.bullets.length > 0 && (() => {
                const bulletsGapKey = `${exp.id}-bullets`;
                const bulletsGap = entryGaps?.[bulletsGapKey] ?? 0;
                return (
                  <>
                    <GapHandle
                      gap={bulletsGap}
                      defaultGap={0}
                      onChange={(newGap) => updateEntryGap(bulletsGapKey, newGap)}
                    />
                    <div className="bullet-list" style={{ ...bulletStyle, ...(bulletsGap !== 0 ? { marginTop: `${bulletsGap}pt` } : {}) }}>
                  {exp.bullets.map((b, bIdx) => {
                    const bGap = entryGaps?.[b.id] ?? bulletSpacing;
                    return (
                      <React.Fragment key={b.id}>
                        {bIdx > 0 && (
                          <GapHandle
                            gap={bGap}
                            defaultGap={bulletSpacing}
                            onChange={(newGap) => updateEntryGap(b.id, newGap)}
                          />
                        )}
                        <EditableText tag="div" className="bullet-item" value={b.text} onSave={(v) => updateBullet(exp.id, b.id, v, 'experience')} placeholder="Bullet point" style={bIdx > 0 ? { marginTop: `${bGap}pt` } : undefined} />
                      </React.Fragment>
                    );
                  })}
                </div>
                  </>
                );
              })()}
            </div>
          </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

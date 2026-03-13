import React from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { EditableText } from './EditableText';
import { GapHandle } from './GapHandle';
import { LayoutRow } from './LayoutRow';
import { filterRowSegments } from '../../utils/filterRowSegments';
import { DEFAULT_LAYOUT } from '../../types/resume';
import type { CustomSection, ExperienceEntry, ProjectEntry, RowSegment } from '../../types/resume';

interface Props {
  section: CustomSection;
  bulletStyle?: React.CSSProperties;
}

const EXP_FIELDS: Record<string, { placeholder: string; defaultClass: string }> = {
  company: { placeholder: 'Company', defaultClass: 'entry-company' },
  location: { placeholder: 'Location', defaultClass: 'entry-location' },
  role: { placeholder: 'Role', defaultClass: 'entry-role' },
  dates: { placeholder: 'Dates', defaultClass: 'entry-dates' },
};

const PROJ_FIELDS: Record<string, { placeholder: string; defaultClass: string }> = {
  title: { placeholder: 'Project Title', defaultClass: 'project-title' },
  techStack: { placeholder: 'Tech Stack', defaultClass: 'project-tech' },
  date: { placeholder: 'Date', defaultClass: 'project-date' },
};

function BulletsPreview({ section, bulletStyle }: Props) {
  const updateCustomItem = useResumeStore((s) => s.updateCustomItem);
  const entryGaps = useResumeStore((s) => s.data.entryGaps);
  const bulletSpacing = useResumeStore((s) => s.data.format?.bulletSpacing ?? 0);
  const updateEntryGap = useResumeStore((s) => s.updateEntryGap);

  if (section.items.length === 0) return null;

  return (
    <div className="bullet-list" style={bulletStyle}>
      {section.items.map((item, idx) => {
        const bGap = entryGaps?.[item.id] ?? bulletSpacing;
        return (
          <React.Fragment key={item.id}>
            {idx > 0 && (
              <GapHandle
                gap={bGap}
                defaultGap={bulletSpacing}
                onChange={(newGap) => updateEntryGap(item.id, newGap)}
              />
            )}
            <EditableText
              tag="div"
              className="bullet-item"
              value={item.text}
              onSave={(v) => updateCustomItem(section.id, item.id, v)}
              placeholder="Item text"
              style={idx > 0 ? { marginTop: `${bGap}pt` } : undefined}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ExperienceFormatPreview({ section, bulletStyle }: Props) {
  const updateEntry = useResumeStore((s) => s.updateCustomEntry);
  const updateBullet = useResumeStore((s) => s.updateCustomEntryBullet);
  const entryGaps = useResumeStore((s) => s.data.entryGaps);
  const bulletSpacing = useResumeStore((s) => s.data.format?.bulletSpacing ?? 0);
  const updateEntryGap = useResumeStore((s) => s.updateEntryGap);
  const lo = useResumeStore((s) => s.data.layout?.experience) ?? DEFAULT_LAYOUT.experience;

  const entries = (section.entries || []) as ExperienceEntry[];
  if (entries.length === 0) return null;

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
                            if (seg.type === 'spacer') return <div key={`spacer-${segIdx}`} className="row-spacer" />;
                            if (seg.type === 'literal') return <span key={seg.value} className={seg.className} style={gapStyle}>{seg.value}</span>;
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
                                onSave={(v) => updateEntry(section.id, exp.id, seg.value, v)}
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
                      <GapHandle gap={bulletsGap} defaultGap={0} onChange={(newGap) => updateEntryGap(bulletsGapKey, newGap)} />
                      <div className="bullet-list" style={{ ...bulletStyle, ...(bulletsGap !== 0 ? { marginTop: `${bulletsGap}pt` } : {}) }}>
                        {exp.bullets.map((b, bIdx) => {
                          const bGap = entryGaps?.[b.id] ?? bulletSpacing;
                          return (
                            <React.Fragment key={b.id}>
                              {bIdx > 0 && (
                                <GapHandle gap={bGap} defaultGap={bulletSpacing} onChange={(newGap) => updateEntryGap(b.id, newGap)} />
                              )}
                              <EditableText
                                tag="div"
                                className="bullet-item"
                                value={b.text}
                                onSave={(v) => updateBullet(section.id, exp.id, b.id, v)}
                                placeholder="Bullet point"
                                style={bIdx > 0 ? { marginTop: `${bGap}pt` } : undefined}
                              />
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

function ProjectsFormatPreview({ section, bulletStyle }: Props) {
  const updateEntry = useResumeStore((s) => s.updateCustomEntry);
  const updateBullet = useResumeStore((s) => s.updateCustomEntryBullet);
  const entryGaps = useResumeStore((s) => s.data.entryGaps);
  const bulletSpacing = useResumeStore((s) => s.data.format?.bulletSpacing ?? 0);
  const updateEntryGap = useResumeStore((s) => s.updateEntryGap);
  const lo = useResumeStore((s) => s.data.layout?.projects) ?? DEFAULT_LAYOUT.projects;

  const entries = (section.entries || []) as ProjectEntry[];
  if (entries.length === 0) return null;

  return (
    <div>
      {entries.map((proj, idx) => {
        const values: Record<string, string> = {
          title: proj.title || '',
          techStack: (lo.techStackPosition === 'inline' ? proj.techStack : '') ?? '',
          date: proj.date ?? '',
        };
        const entryGap = entryGaps?.[proj.id] ?? bulletSpacing;

        return (
          <React.Fragment key={proj.id}>
            {idx > 0 && (
              <GapHandle gap={entryGap} defaultGap={bulletSpacing} onChange={(newGap) => updateEntryGap(proj.id, newGap)} />
            )}
            <div className={`project-entry${lo.showEntryBulletMarker ? '' : ' no-bullet'}`} style={idx > 0 ? { marginTop: `${entryGap}pt` } : undefined}>
              {lo.showEntryBulletMarker && <div className="project-bullet">{'\u2022'}</div>}
              <div className="project-content">
                {(() => {
                  const visibleRows = lo.rows
                    .map((row, rowIdx) => ({ row, rowIdx, filtered: filterRowSegments(row, values) }))
                    .filter((r): r is typeof r & { filtered: NonNullable<typeof r.filtered> } => r.filtered !== null);

                  return visibleRows.map(({ rowIdx, filtered }, visIdx) => {
                    const rowGapKey = `${proj.id}-row-${rowIdx}`;
                    const rowGap = entryGaps?.[rowGapKey] ?? 0;
                    return (
                      <React.Fragment key={rowIdx}>
                        {visIdx > 0 && (
                          <GapHandle gap={rowGap} defaultGap={0} onChange={(newGap) => updateEntryGap(rowGapKey, newGap)} />
                        )}
                        <LayoutRow
                          sectionKey="projects"
                          rowIdx={rowIdx}
                          row={filtered}
                          allRows={lo.rows}
                          className="project-header"
                          style={visIdx > 0 && rowGap !== 0 ? { marginTop: `${rowGap}pt` } : undefined}
                          entryId={proj.id}
                          renderSegment={(seg: RowSegment, segIdx: number, gapStyle?: React.CSSProperties) => {
                            if (seg.type === 'spacer') return <div key={`spacer-${segIdx}`} className="row-spacer" />;
                            if (seg.type === 'literal') return <span key={seg.value} className={seg.className} style={gapStyle}>{seg.value}</span>;
                            const fieldDef = PROJ_FIELDS[seg.value];
                            if (!fieldDef) return null;
                            const value = values[seg.value];
                            const isBold = lo.boldField === seg.value;
                            const isItalic = lo.italicField === seg.value;
                            const cls = `${seg.className || fieldDef.defaultClass}${isBold ? ' field-bold' : ''}${isItalic ? ' field-italic' : ''}`;

                            if (seg.value === 'techStack' && lo.techStackPosition === 'inline') {
                              return (
                                <span key={seg.value} style={gapStyle}>
                                  {' ('}
                                  <EditableText className={cls} value={value} onSave={(v) => updateEntry(section.id, proj.id, 'techStack', v)} placeholder={fieldDef.placeholder} />
                                  {')'}
                                </span>
                              );
                            }

                            return (
                              <EditableText
                                key={seg.value}
                                className={cls}
                                style={gapStyle}
                                value={value}
                                onSave={(v) => updateEntry(section.id, proj.id, seg.value, v)}
                                placeholder={fieldDef.placeholder}
                              />
                            );
                          }}
                        />
                      </React.Fragment>
                    );
                  });
                })()}
                {lo.techStackPosition === 'below' && proj.techStack !== undefined && proj.techStack !== '' && (
                  <div className="project-tech-row">
                    <EditableText className="project-tech" value={proj.techStack || ''} onSave={(v) => updateEntry(section.id, proj.id, 'techStack', v)} placeholder="Tech Stack" />
                  </div>
                )}
                {proj.bullets.length > 0 && (() => {
                  const bulletsGapKey = `${proj.id}-bullets`;
                  const bulletsGap = entryGaps?.[bulletsGapKey] ?? 0;
                  return (
                    <>
                      <GapHandle gap={bulletsGap} defaultGap={0} onChange={(newGap) => updateEntryGap(bulletsGapKey, newGap)} />
                      <div className="project-bullets" style={{ ...bulletStyle, ...(bulletsGap !== 0 ? { marginTop: `${bulletsGap}pt` } : {}) }}>
                        {proj.bullets.map((b, bIdx) => {
                          const bGap = entryGaps?.[b.id] ?? bulletSpacing;
                          return (
                            <React.Fragment key={b.id}>
                              {bIdx > 0 && (
                                <GapHandle gap={bGap} defaultGap={bulletSpacing} onChange={(newGap) => updateEntryGap(b.id, newGap)} />
                              )}
                              <EditableText tag="div" className="bullet-item" value={b.text} onSave={(v) => updateBullet(section.id, proj.id, b.id, v)} placeholder="Bullet point" style={bIdx > 0 ? { marginTop: `${bGap}pt` } : undefined} />
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

export function CustomSectionPreview({ section, bulletStyle }: Props) {
  const format = section.format || 'bullets';

  if (format === 'experience') {
    return <ExperienceFormatPreview section={section} bulletStyle={bulletStyle} />;
  }
  if (format === 'projects') {
    return <ProjectsFormatPreview section={section} bulletStyle={bulletStyle} />;
  }
  return <BulletsPreview section={section} bulletStyle={bulletStyle} />;
}

import { useResumeStore } from '../../hooks/useResumeStore';
import { EditableText } from './EditableText';
import { LayoutRow } from './LayoutRow';
import { filterRowSegments } from '../../utils/filterRowSegments';
import { DEFAULT_LAYOUT } from '../../types/resume';
import type { ProjectEntry, ProjectsSectionLayout, RowSegment } from '../../types/resume';

interface Props {
  entries: ProjectEntry[];
  bulletStyle?: React.CSSProperties;
  layout?: ProjectsSectionLayout;
}

const PROJ_FIELDS: Record<string, { placeholder: string; defaultClass: string }> = {
  title: { placeholder: 'Project Title', defaultClass: 'project-title' },
  techStack: { placeholder: 'Tech Stack', defaultClass: 'project-tech' },
  date: { placeholder: 'Date', defaultClass: 'project-date' },
};

export function ProjectsSection({ entries, bulletStyle, layout }: Props) {
  const updateProject = useResumeStore((s) => s.updateProject);
  const updateBullet = useResumeStore((s) => s.updateBullet);
  const lo = layout ?? DEFAULT_LAYOUT.projects;

  return (
    <div>
      {entries.map((proj) => {
        const values: Record<string, string> = {
          title: proj.title || '',
          techStack: (lo.techStackPosition === 'inline' ? proj.techStack : '') ?? '',
          date: proj.date ?? '',
        };

        return (
          <div key={proj.id} className={`project-entry${lo.showEntryBulletMarker ? '' : ' no-bullet'}`}>
            {lo.showEntryBulletMarker && <div className="project-bullet">{'\u2022'}</div>}
            <div className="project-content">
              {lo.rows.map((row, rowIdx) => {
                const filtered = filterRowSegments(row, values);
                if (!filtered) return null;

                return (
                  <LayoutRow
                    key={rowIdx}
                    sectionKey="projects"
                    rowIdx={rowIdx}
                    row={filtered}
                    allRows={lo.rows}
                    className="project-header"
                    renderSegment={(seg: RowSegment, segIdx: number, gapStyle?: React.CSSProperties) => {
                      if (seg.type === 'spacer') {
                        return <div key={`spacer-${segIdx}`} className="row-spacer" />;
                      }
                      if (seg.type === 'literal') {
                        return <span key={seg.value} className={seg.className} style={gapStyle}>{seg.value}</span>;
                      }
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
                            <EditableText
                              className={cls}
                              value={value}
                              onSave={(v) => updateProject(proj.id, 'techStack', v)}
                              placeholder={fieldDef.placeholder}
                            />
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
                          onSave={(v) => updateProject(proj.id, seg.value as keyof ProjectEntry, v)}
                          placeholder={fieldDef.placeholder}
                        />
                      );
                    }}
                  />
                );
              })}
              {lo.techStackPosition === 'below' && proj.techStack !== undefined && proj.techStack !== '' && (
                <div className="project-tech-row">
                  <EditableText
                    className="project-tech"
                    value={proj.techStack || ''}
                    onSave={(v) => updateProject(proj.id, 'techStack', v)}
                    placeholder="Tech Stack"
                  />
                </div>
              )}
              {proj.bullets.length > 0 && (
                <ul className="project-bullets" style={bulletStyle}>
                  {proj.bullets.map((b) => (
                    <EditableText key={b.id} tag="li" value={b.text} onSave={(v) => updateBullet(proj.id, b.id, v, 'projects')} placeholder="Bullet point" />
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

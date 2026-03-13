import React from 'react';
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useResumeStore } from '../../hooks/useResumeStore';
import { DEFAULT_FORMAT, DEFAULT_SECTION_ORDER, DEFAULT_LAYOUT } from '../../types/resume';
import { HeaderSection } from './HeaderSection';
import { EducationSection } from './EducationSection';
import { SkillsSection } from './SkillsSection';
import { ExperienceSection } from './ExperienceSection';
import { ProjectsSection } from './ProjectsSection';
import { CustomSectionPreview } from './CustomSectionPreview';
import { SectionHeading } from './SectionHeading';
import { EditableText } from './EditableText';
import { GapHandle } from './GapHandle';
import '../../styles/resume.css';

function SortableSectionBlock({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className={`sortable-section${isDragging ? ' dragging' : ''}`}>
      <button
        className="section-drag-handle"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        &#x2630;
      </button>
      {children}
    </div>
  );
}

const PAGE_HEIGHT_PX = 11 * 96;  // 11 inches at 96 dpi
const PAGE_WIDTH_PX = 8.5 * 96;

export function ResumePreview() {
  const data = useResumeStore((s) => s.data);
  const moveSectionOrder = useResumeStore((s) => s.moveSectionOrder);
  const updateSummary = useResumeStore((s) => s.updateSummary);
  const updateSectionGap = useResumeStore((s) => s.updateSectionGap);
  const fmt = data.format || DEFAULT_FORMAT;
  const lo = data.layout ?? DEFAULT_LAYOUT;
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.75);
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);

  const marginTopPx = fmt.marginTop * 96;
  const marginBottomPx = fmt.marginBottom * 96;
  const usableHeight = PAGE_HEIGHT_PX - marginTopPx - marginBottomPx;

  // Measure sections and compute page breaks
  const computePages = useCallback(() => {
    const el = measureRef.current;
    if (!el) return;

    // Each direct child of the measure div is a "section block"
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;

    const breaks: number[] = [];
    let currentPageUsed = 0;

    for (let i = 0; i < children.length; i++) {
      const style = window.getComputedStyle(children[i]);
      const marginTop = parseFloat(style.marginTop) || 0;
      const marginBottom = parseFloat(style.marginBottom) || 0;
      const childHeight = children[i].offsetHeight + marginTop + marginBottom;

      if (currentPageUsed === 0) {
        // First item on a new page always goes on it
        currentPageUsed += childHeight;
      } else if (currentPageUsed + childHeight > usableHeight) {
        // Doesn't fit - start a new page at this index
        breaks.push(i);
        currentPageUsed = childHeight;
      } else {
        currentPageUsed += childHeight;
      }
    }

    setPageBreaks(breaks);
  }, [usableHeight]);

  useEffect(() => {
    // Use rAF to ensure layout is complete before measuring
    const id = requestAnimationFrame(computePages);
    return () => cancelAnimationFrame(id);
  }, [data, computePages]);

  // Compute scale to fit container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let currentScale = 0.75;
    function updateScale() {
      if (el) {
        const containerWidth = el.clientWidth - 48;
        if (containerWidth > 0) {
          const newScale = Math.min(1, containerWidth / PAGE_WIDTH_PX);
          // Only update if scale changed meaningfully (prevents oscillation)
          if (Math.abs(newScale - currentScale) > 0.005) {
            currentScale = newScale;
            setScale(newScale);
          }
        }
      }
    }

    const ro = new ResizeObserver(() => requestAnimationFrame(updateScale));
    ro.observe(el);
    requestAnimationFrame(updateScale);

    return () => ro.disconnect();
  }, []);

  const pageStyle: React.CSSProperties = {
    fontFamily: fmt.fontFamily,
    fontSize: `${fmt.fontSize}pt`,
    lineHeight: fmt.lineHeight,
    padding: `${fmt.marginTop}in ${fmt.marginRight}in ${fmt.marginBottom}in ${fmt.marginLeft}in`,
    ['--bullet-gap' as string]: fmt.bulletSpacing > 0 ? `${fmt.bulletSpacing}pt` : '0',
  };

  const nameStyle: React.CSSProperties = { fontSize: `${fmt.nameFontSize}pt` };
  const contactStyle: React.CSSProperties = { fontSize: `${fmt.contactFontSize}pt` };
  const headingStyle: React.CSSProperties = { fontSize: `${fmt.headingFontSize}pt` };

  const gapFor = (key: string): React.CSSProperties => ({
    marginTop: `${data.sectionGaps?.[key] ?? fmt.sectionSpacing}pt`,
  });

  // Build section blocks in sectionOrder
  const order = data.sectionOrder || DEFAULT_SECTION_ORDER;
  const sectionKeys: string[] = [];
  const sectionBlocks: React.ReactNode[] = [];

  const sectionRenderers: Record<string, () => React.ReactNode | React.ReactNode[] | null> = {
    header: () => (
      <div key="header">
        <HeaderSection contact={data.contact} nameStyle={nameStyle} contactStyle={contactStyle} layout={lo.header} />
      </div>
    ),
    education: () => data.education.length > 0 ? (
      <div key="education" style={gapFor('education')}>
        <SectionHeading title="Education" style={headingStyle} />
        <EducationSection entries={data.education} layout={lo.education} />
      </div>
    ) : null,
    summary: () => data.summary ? (
      <div key="summary" style={gapFor('summary')}>
        <SectionHeading title="Professional Summary" style={headingStyle} />
        <EditableText tag="p" className="resume-summary" value={data.summary} onSave={updateSummary} placeholder="Professional summary..." />
      </div>
    ) : null,
    skills: () => data.skills.length > 0 ? (
      <div key="skills" style={gapFor('skills')}>
        <SectionHeading title="Skills Summary" style={headingStyle} />
        <SkillsSection rows={data.skills} layout={lo.skills} />
      </div>
    ) : null,
    experience: () => {
      if (data.experience.length === 0) return null;
      const blocks: React.ReactNode[] = [];
      // First block: heading + first entry (keeps heading with at least one entry)
      blocks.push(
        <div key="experience-0" style={gapFor('experience')}>
          <SectionHeading title="Experience" style={headingStyle} />
          <ExperienceSection entries={data.experience.slice(0, 1)} bulletStyle={{}} layout={lo.experience} />
        </div>
      );
      // Each subsequent entry as its own block so page breaks can occur between entries
      for (let i = 1; i < data.experience.length; i++) {
        const entry = data.experience[i];
        const gap = data.entryGaps?.[entry.id] ?? fmt.bulletSpacing ?? 0;
        blocks.push(
          <div key={`experience-${i}`} style={{ marginTop: `${gap}pt` }}>
            <ExperienceSection entries={[entry]} bulletStyle={{}} layout={lo.experience} />
          </div>
        );
      }
      return blocks;
    },
    projects: () => {
      if (data.projects.length === 0) return null;
      const blocks: React.ReactNode[] = [];
      blocks.push(
        <div key="projects-0" style={gapFor('projects')}>
          <SectionHeading title="Projects" style={headingStyle} />
          <ProjectsSection entries={data.projects.slice(0, 1)} bulletStyle={{}} layout={lo.projects} />
        </div>
      );
      for (let i = 1; i < data.projects.length; i++) {
        const entry = data.projects[i];
        const gap = data.entryGaps?.[entry.id] ?? fmt.bulletSpacing ?? 0;
        blocks.push(
          <div key={`projects-${i}`} style={{ marginTop: `${gap}pt` }}>
            <ProjectsSection entries={[entry]} bulletStyle={{}} layout={lo.projects} />
          </div>
        );
      }
      return blocks;
    },
  };

  // blockMeta tracks which section each block belongs to and whether it's the first block in that section
  const blockMeta: { sectionKey: string; isFirst: boolean }[] = [];

  for (const key of order) {
    if (sectionRenderers[key]) {
      const result = sectionRenderers[key]();
      if (!result) continue;

      if (Array.isArray(result)) {
        sectionKeys.push(key);
        result.forEach((block, i) => {
          sectionBlocks.push(block);
          blockMeta.push({ sectionKey: key, isFirst: i === 0 });
        });
      } else {
        sectionKeys.push(key);
        sectionBlocks.push(result);
        blockMeta.push({ sectionKey: key, isFirst: true });
      }
    } else if (key.startsWith('custom-')) {
      const cs = data.customSections?.find(c => `custom-${c.id}` === key);
      if (cs && (cs.items.length > 0 || (cs.entries && cs.entries.length > 0))) {
        sectionKeys.push(key);
        sectionBlocks.push(
          <div key={key} style={gapFor(key)}>
            <SectionHeading title={cs.title} style={headingStyle} />
            <CustomSectionPreview section={cs} bulletStyle={{}} />
          </div>
        );
        blockMeta.push({ sectionKey: key, isFirst: true });
      }
    }
  }

  // Render any custom sections not in the order list
  data.customSections?.forEach((cs) => {
    const key = `custom-${cs.id}`;
    if (!order.includes(key) && (cs.items.length > 0 || (cs.entries && cs.entries.length > 0))) {
      sectionKeys.push(key);
      sectionBlocks.push(
        <div key={key} style={gapFor(key)}>
          <SectionHeading title={cs.title} style={headingStyle} />
          <CustomSectionPreview section={cs} bulletStyle={{}} />
        </div>
      );
      blockMeta.push({ sectionKey: key, isFirst: true });
    }
  });

  // Drag-and-drop sensors and handler
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromKey = active.id as string;
    const toKey = over.id as string;
    const fromIndex = order.indexOf(fromKey);
    const toIndex = order.indexOf(toKey);
    if (fromIndex >= 0 && toIndex >= 0) {
      moveSectionOrder(fromIndex, toIndex);
    }
  }, [order, moveSectionOrder]);

  // Split sectionBlocks into pages using the computed breaks
  const pages: React.ReactNode[][] = [];
  let startIdx = 0;
  for (const breakIdx of pageBreaks) {
    pages.push(sectionBlocks.slice(startIdx, breakIdx));
    startIdx = breakIdx;
  }
  pages.push(sectionBlocks.slice(startIdx));

  const totalPages = pages.length;
  const pageGap = 24;
  const scaledPageHeight = PAGE_HEIGHT_PX * scale;
  const scaledPageWidth = PAGE_WIDTH_PX * scale;

  return (
    <div className="resume-preview-container" ref={containerRef}>
      {data.css && <style>{data.css}</style>}
      {/* Hidden measuring div -- renders all sections at full size to measure heights */}
      <div
        ref={measureRef}
        className="resume-page resume-measure"
        style={{
          ...pageStyle,
          height: 'auto',
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          left: '-9999px',
        }}
      >
        {sectionBlocks}
      </div>

      {/* Visible pages */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sectionKeys} strategy={verticalListSortingStrategy}>
            <div className="resume-pages-stack">
              {pages.map((pageSections, pageIdx) => (
                <div
                  key={pageIdx}
                  className="resume-page-slot"
                  style={{
                    width: scaledPageWidth,
                    height: scaledPageHeight,
                    marginBottom: pageIdx < totalPages - 1 ? pageGap : 0,
                  }}
                >
                  <div
                    className="resume-preview-wrapper"
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: 'top center',
                      width: '8.5in',
                      height: '11in',
                      margin: '0 auto',
                    }}
                  >
                    <div className="resume-page" style={pageStyle}>
                      {pageSections.map((block, i) => {
                        const globalIdx = pages.slice(0, pageIdx).reduce((sum, p) => sum + p.length, 0) + i;
                        const meta = blockMeta[globalIdx];
                        const showGap = meta.isFirst && meta.sectionKey !== 'header' && (i > 0 || pageIdx > 0);
                        const blockKey = meta.isFirst ? meta.sectionKey : `${meta.sectionKey}-sub-${globalIdx}`;
                        return (
                          <React.Fragment key={blockKey}>
                            {showGap && (
                              <GapHandle
                                gap={data.sectionGaps?.[meta.sectionKey] ?? fmt.sectionSpacing}
                                defaultGap={fmt.sectionSpacing}
                                onChange={(newGap) => updateSectionGap(meta.sectionKey, newGap)}
                              />
                            )}
                            {meta.isFirst ? (
                              <SortableSectionBlock id={meta.sectionKey}>
                                {block}
                              </SortableSectionBlock>
                            ) : (
                              <div>{block}</div>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {totalPages > 1 && (
                        <div className="page-number">
                          Page {pageIdx + 1} of {totalPages}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
      </DndContext>
    </div>
  );
}

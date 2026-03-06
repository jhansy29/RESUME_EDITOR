import React from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { GapHandle } from './GapHandle';
import type { RowSegment } from '../../types/resume';

interface Props {
  sectionKey: 'education' | 'experience' | 'projects';
  rowIdx: number;
  row: RowSegment[];
  allRows: RowSegment[][];
  className: string;
  style?: React.CSSProperties;
  entryId?: string;
  renderSegment: (seg: RowSegment, segIdx: number, gapStyle?: React.CSSProperties) => React.ReactNode;
}

export function LayoutRow({ row, className, style, entryId, rowIdx, renderSegment }: Props) {
  const entryGaps = useResumeStore((s) => s.data.entryGaps);
  const updateEntryGap = useResumeStore((s) => s.updateEntryGap);

  return (
    <div className={className} style={style}>
      {row.map((seg, segIdx) => {
        const defaultGap = seg.gap ?? 0;
        const gapKey = entryId ? `${entryId}-r${rowIdx}-s${segIdx}` : '';
        const hasOverride = entryId && entryGaps?.[gapKey] != null;
        const gapVal = hasOverride ? entryGaps![gapKey] : defaultGap;
        const isLast = segIdx === row.length - 1;
        const showHandle = !isLast && !!entryId;

        // Spacer segments become flex:1 GapHandles that span the full visual gap
        if (seg.type === 'spacer' && entryId) {
          return (
            <GapHandle
              key={`spacer-${segIdx}`}
              gap={gapVal}
              defaultGap={defaultGap}
              onChange={(newGap) => updateEntryGap(gapKey, newGap)}
              orientation="horizontal"
              flexGrow
            />
          );
        }

        // When we show a horizontal GapHandle, it replaces the marginRight
        const gapStyle = (!showHandle && gapVal > 0)
          ? { marginRight: `${gapVal}pt` } as React.CSSProperties
          : undefined;

        return (
          <React.Fragment key={segIdx}>
            {renderSegment(seg, segIdx, gapStyle)}
            {showHandle && (
              <GapHandle
                gap={gapVal}
                defaultGap={defaultGap}
                onChange={(newGap) => updateEntryGap(gapKey, newGap)}
                orientation="horizontal"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

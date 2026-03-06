import type { RowSegment } from '../../types/resume';

interface Props {
  sectionKey: 'education' | 'experience' | 'projects';
  rowIdx: number;
  row: RowSegment[];
  allRows: RowSegment[][];
  className: string;
  renderSegment: (seg: RowSegment, segIdx: number, gapStyle?: React.CSSProperties) => React.ReactNode;
}

export function LayoutRow({ row, className, renderSegment }: Props) {
  return (
    <div className={className}>
      {row.map((seg, segIdx) => {
        const gapStyle = seg.gap ? { marginRight: `${seg.gap}pt` } as React.CSSProperties : undefined;
        return renderSegment(seg, segIdx, gapStyle);
      })}
    </div>
  );
}

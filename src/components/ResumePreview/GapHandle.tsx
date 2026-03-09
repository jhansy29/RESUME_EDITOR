import { useRef, useState, useEffect, useCallback } from 'react';

interface Props {
  gap: number;
  defaultGap: number;
  onChange: (newGap: number) => void;
  orientation?: 'vertical' | 'horizontal';
  flexGrow?: boolean;
}

const MIN_GAP = -50;
const MAX_GAP = 1000;
const STEP = 0.5;
const PX_PER_PT = 96 / 72; // 1pt = 1.333px

export function GapHandle({ gap, defaultGap, onChange, orientation = 'vertical', flexGrow }: Props) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const zoneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // For flexGrow spacers: measured natural width in pt (when no override set)
  const [measuredPt, setMeasuredPt] = useState<number | null>(null);

  // For flexGrow spacers, the effective gap is the stored value or the measured natural width
  const isSpacerOverride = flexGrow && gap !== 0;
  // What to display and scroll from
  const displayGap = flexGrow ? (isSpacerOverride ? gap : (measuredPt ?? 0)) : gap;

  // Use non-passive wheel listener to preventDefault
  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? STEP : -STEP;
      // For spacers: scroll from the current displayed width
      const base = flexGrow ? displayGap : gap;
      const newGap = Math.min(MAX_GAP, Math.max(0, +(base + delta).toFixed(1)));
      if (newGap !== gap || (flexGrow && !isSpacerOverride)) onChange(newGap);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [gap, onChange, flexGrow, displayGap, isSpacerOverride]);

  // Measure the spacer's natural flex:1 width
  useEffect(() => {
    if (!flexGrow || isSpacerOverride || !zoneRef.current) return;
    const measure = () => {
      if (zoneRef.current) {
        const widthPx = zoneRef.current.offsetWidth;
        setMeasuredPt(Math.round(widthPx / PX_PER_PT * 10) / 10);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(zoneRef.current);
    return () => observer.disconnect();
  }, [flexGrow, isSpacerOverride]);

  const startEdit = useCallback(() => {
    setInputVal(String(displayGap));
    setEditing(true);
  }, [displayGap]);

  const commitEdit = useCallback(() => {
    const v = parseFloat(inputVal);
    if (!isNaN(v)) {
      const clamped = Math.min(MAX_GAP, Math.max(0, v));
      onChange(clamped);
    }
    setEditing(false);
  }, [inputVal, onChange]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const isOverride = flexGrow ? isSpacerOverride : (gap !== defaultGap);

  const label = editing ? (
    <input
      ref={inputRef}
      type="number"
      className="gap-handle-input"
      value={inputVal}
      min={0}
      max={MAX_GAP}
      step={STEP}
      onChange={(e) => setInputVal(e.target.value)}
      onBlur={commitEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commitEdit();
        if (e.key === 'Escape') cancelEdit();
      }}
    />
  ) : (
    <span
      className={`gap-handle-label${isOverride ? ' gap-handle-override' : ''}`}
      onClick={startEdit}
    >
      {displayGap}pt
    </span>
  );

  if (orientation === 'horizontal') {
    let hStyle: React.CSSProperties;
    if (flexGrow) {
      if (isSpacerOverride) {
        // User set a specific width — use it as fixed
        hStyle = { flex: 'none', width: `${gap}pt`, minWidth: '4px' };
      } else {
        // Default: fill remaining space
        hStyle = { flex: 1, minWidth: '4px' };
      }
    } else {
      hStyle = { width: `${Math.max(gap, 4)}pt`, minWidth: '4px' };
    }
    return (
      <div
        ref={zoneRef}
        className="gap-handle-zone-h"
        style={hStyle}
      >
        {label}
      </div>
    );
  }

  // Vertical (default)
  const overlayHeightPt = Math.max(gap, 4);
  const offsetPt = overlayHeightPt / 2;

  return (
    <div className="gap-handle-zone">
      <div
        ref={zoneRef}
        className="gap-handle-overlay"
        style={{
          top: `-${offsetPt}pt`,
          height: `${overlayHeightPt}pt`,
          minHeight: '6px',
        }}
      >
        {label}
      </div>
    </div>
  );
}

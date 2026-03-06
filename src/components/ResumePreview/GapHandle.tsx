import { useRef, useCallback } from 'react';

interface Props {
  gap: number;
  onChange: (newGap: number) => void;
}

export function GapHandle({ gap, onChange }: Props) {
  const startX = useRef(0);
  const startGap = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const delta = e.clientX - startX.current;
    // 1px mouse movement = 0.5pt gap change
    const newGap = Math.max(0, Math.round(startGap.current + delta * 0.5));
    onChange(newGap);
  }, [onChange]);

  const handleMouseUp = useCallback(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startGap.current = gap;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [gap, handleMouseMove, handleMouseUp]);

  return (
    <div
      className="gap-handle"
      onMouseDown={handleMouseDown}
    />
  );
}

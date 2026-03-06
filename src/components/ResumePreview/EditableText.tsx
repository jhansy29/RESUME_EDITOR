import { useRef, useCallback, useEffect, memo } from 'react';

interface Props {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  tag?: 'span' | 'div' | 'p' | 'li';
  placeholder?: string;
  style?: React.CSSProperties;
}

/** Convert **bold** markdown in plain text to HTML with <strong> tags */
export function markdownToHtml(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

/** Convert <strong> tags back to **markdown** */
export function htmlToMarkdown(html: string): string {
  let text = html.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  text = text.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  return text.trim();
}

/** Wrapper tags for li elements need special handling (can't nest div inside li) */
const BLOCK_TAGS = new Set(['div', 'p', 'li']);

export const EditableText = memo(function EditableText({ value, onSave, className, tag: Tag = 'span', placeholder, style }: Props) {
  const ref = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef(value);
  const isEditing = useRef(false);

  // Set innerHTML on mount
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = markdownToHtml(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync displayed content when value changes externally (not during editing)
  useEffect(() => {
    savedRef.current = value;
    if (!isEditing.current && ref.current) {
      ref.current.innerHTML = markdownToHtml(value);
    }
  }, [value]);

  const handleFocus = useCallback(() => {
    isEditing.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isEditing.current = false;
    const el = ref.current;
    if (!el) return;
    const text = htmlToMarkdown(el.innerHTML);
    if (text !== savedRef.current) {
      savedRef.current = text;
      onSave(text);
    }
    el.innerHTML = markdownToHtml(text);
  }, [onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      isEditing.current = false;
      const el = ref.current;
      if (el) {
        el.innerHTML = markdownToHtml(savedRef.current);
        el.blur();
      }
    }
  }, []);

  const startResize = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wrap = wrapRef.current;
    if (!wrap) return;

    const startX = e.clientX;
    const startWidth = wrap.offsetWidth;

    function onMove(moveEvent: MouseEvent) {
      const dx = moveEvent.clientX - startX;
      const newWidth = side === 'right'
        ? Math.max(20, startWidth + dx)
        : Math.max(20, startWidth - dx);
      wrap!.style.width = `${newWidth}px`;
      wrap!.style.flexShrink = '0';
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  // Block tags (div, p, li) can't be wrapped in a span — use a div wrapper or skip wrapping
  const isBlock = BLOCK_TAGS.has(Tag);

  if (isBlock) {
    // For block elements (li, div, p), render without resize wrapper
    return (
      <Tag
        ref={ref as React.RefObject<never>}
        className={`editable-text ${className || ''}`}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={style}
      />
    );
  }

  // Inline elements (span) get resize handles on both sides
  return (
    <span className="editable-text-wrap" ref={wrapRef}>
      <span
        className="resize-handle resize-handle-left"
        onMouseDown={(e) => startResize('left', e)}
      />
      <Tag
        ref={ref as React.RefObject<never>}
        className={`editable-text ${className || ''}`}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={style}
      />
      <span
        className="resize-handle resize-handle-right"
        onMouseDown={(e) => startResize('right', e)}
      />
    </span>
  );
});

import { useRef, useEffect } from 'react';
import { parseBoldText } from '../../utils/boldParser';

interface Props {
  text: string;
  onChange: (text: string) => void;
  onRemove: () => void;
}

export function BulletInput({ text, onChange, onRemove }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [text]);

  return (
    <div>
      <div className="bullet-editor">
        <span className="drag-handle">⠿</span>
        <textarea
          ref={ref}
          className="bullet-textarea"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Use **text** for bold keywords"
          rows={1}
        />
        <button className="bullet-remove" onClick={onRemove} title="Remove bullet">
          ×
        </button>
      </div>
      {text && text.includes('**') && (
        <div className="bullet-preview">{parseBoldText(text)}</div>
      )}
    </div>
  );
}

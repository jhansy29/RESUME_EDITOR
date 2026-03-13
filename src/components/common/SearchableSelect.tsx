import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Search...', emptyLabel = '-- None --', className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || '';

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className={`searchable-select ${className || ''}`} ref={wrapRef}>
      <button
        type="button"
        className="searchable-select-trigger"
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <span className={selectedLabel ? '' : 'searchable-select-placeholder'}>
          {selectedLabel || emptyLabel}
        </span>
        <span className="searchable-select-arrow">&#9662;</span>
      </button>
      {open && (
        <div className="searchable-select-dropdown">
          <input
            ref={inputRef}
            className="searchable-select-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="searchable-select-options">
            <button
              type="button"
              className={`searchable-select-option ${!value ? 'selected' : ''}`}
              onClick={() => handleSelect('')}
            >
              {emptyLabel}
            </button>
            {filtered.length === 0 ? (
              <div className="searchable-select-empty">No matches</div>
            ) : (
              filtered.map((o) => (
                <button
                  type="button"
                  key={o.value}
                  className={`searchable-select-option ${o.value === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(o.value)}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

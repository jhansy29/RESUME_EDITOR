import { useRef } from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { exportJson, importJson } from '../../utils/storage';
import { exportDocx } from '../../utils/docxExport';
import type { AppView } from './AppShell';

interface Props {
  onShowList: () => void;
  onSaveAsVersion: () => void;
  view?: AppView;
  onViewChange?: (view: AppView) => void;
}

export function Toolbar({ onShowList, onSaveAsVersion, view = 'editor', onViewChange }: Props) {
  const data = useResumeStore((s) => s.data);
  const loadData = useResumeStore((s) => s.loadData);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importJson(file);
      loadData(imported);
    } catch (err) {
      alert('Failed to import: ' + (err as Error).message);
    }
    e.target.value = '';
  };

  const isEditor = view === 'editor';

  return (
    <div className="toolbar">
      <span className="toolbar-title" style={{ cursor: 'pointer' }} onClick={() => onViewChange?.('home')}>
        Resume Studio
      </span>

      <div className="toolbar-group">
        <button
          className={view === 'editor' ? 'active' : ''}
          onClick={() => onViewChange?.('editor')}
        >
          Editor
        </button>
        <button
          className={view === 'vault' ? 'active' : ''}
          onClick={() => onViewChange?.('vault')}
        >
          Vault
        </button>
        <button
          className={view === 'jd-analyzer' ? 'active' : ''}
          onClick={() => onViewChange?.('jd-analyzer')}
        >
          JD Analyzer
        </button>
        <button
          className={view === 'tracker' ? 'active' : ''}
          onClick={() => onViewChange?.('tracker')}
        >
          Tracker
        </button>
      </div>

      {isEditor && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <button onClick={onShowList}>All Resumes</button>
            <button onClick={onSaveAsVersion}>Save as Version</button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button className="primary" onClick={() => window.print()}>PDF</button>
            <button className="primary" onClick={() => exportDocx(data)}>DOCX</button>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <button onClick={() => exportJson(data)}>Export JSON</button>
            <button onClick={() => fileRef.current?.click()}>Import JSON</button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden-input"
              onChange={handleImport}
            />
          </div>
        </>
      )}
    </div>
  );
}

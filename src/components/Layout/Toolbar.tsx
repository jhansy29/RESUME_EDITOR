import { useRef, useState } from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { useAuthStore } from '../../hooks/useAuthStore';
import { exportJson, importJson } from '../../utils/storage';
import { exportDocx } from '../../utils/docxExport';
import type { AppView } from './AppShell';

interface Props {
  onShowList: () => void;
  onSaveAsVersion: () => void;
  view?: AppView;
  onViewChange?: (view: AppView) => void;
  showList?: boolean;
}

export function Toolbar({ onShowList, onSaveAsVersion, view = 'editor', onViewChange, showList }: Props) {
  const data = useResumeStore((s) => s.data);
  const resumeName = useResumeStore((s) => s.resumeName);
  const loadData = useResumeStore((s) => s.loadData);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

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
      {/* Left: brand + nav */}
      <div className="toolbar-left">
        <span className="toolbar-title" style={{ cursor: 'pointer' }} onClick={() => onViewChange?.('home')}>
          Resume Studio
        </span>

        <div className="toolbar-nav">
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
      </div>

      {/* Center: resume name (hidden on list view) */}
      {isEditor && !showList && resumeName && (
        <div className="toolbar-center">
          <span className="toolbar-resume-name">{resumeName}</span>
        </div>
      )}

      {/* Right: actions (hidden on list view) */}
      {isEditor && !showList && (
        <div className="toolbar-right">
          <button onClick={onShowList}>All Resumes</button>
          <button onClick={onSaveAsVersion}>Save as Version</button>

          <div className="toolbar-divider" />

          <div className="toolbar-export-wrapper">
            <button className="primary" onClick={() => setShowExportMenu(!showExportMenu)}>
              Export ▾
            </button>
            {showExportMenu && (
              <div className="toolbar-export-menu" onMouseLeave={() => setShowExportMenu(false)}>
                <button onClick={() => { window.print(); setShowExportMenu(false); }}>PDF</button>
                <button onClick={() => { exportDocx(data, resumeName || undefined); setShowExportMenu(false); }}>DOCX</button>
                <button onClick={() => { exportJson(data, resumeName || undefined); setShowExportMenu(false); }}>JSON</button>
                <button onClick={() => { fileRef.current?.click(); setShowExportMenu(false); }}>Import JSON</button>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden-input"
            onChange={handleImport}
          />
        </div>
      )}

      {/* User menu (always visible) */}
      {user && (
        <div className="toolbar-user">
          <span className="toolbar-user-name">{user.name}</span>
          <button className="toolbar-logout" onClick={logout}>Sign Out</button>
        </div>
      )}
    </div>
  );
}

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { useAuthStore } from '../../hooks/useAuthStore';
import { exportJson, importJson } from '../../utils/storage';
import { exportDocx } from '../../utils/docxExport';
import { listApplications, updateApplication } from '../../api/applicationsApi';
import type { Application } from '../../types/application';
import type { AppView } from './AppShell';

function LinkToJob({ resumeId }: { resumeId: string | null }) {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<Application[]>([]);
  const [linkedApp, setLinkedApp] = useState<Application | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchApps = useCallback(async () => {
    if (!resumeId) return;
    try {
      const all = await listApplications();
      setApps(all);
      setLinkedApp(all.find((a) => a.resumeId === resumeId) || null);
    } catch { /* ignore */ }
  }, [resumeId]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unlinkedApps = useMemo(() => {
    const unlinked = apps.filter((a) => !a.resumeId);
    if (!searchQuery) return unlinked;
    const q = searchQuery.toLowerCase();
    return unlinked.filter((a) =>
      a.company.toLowerCase().includes(q) || a.jobTitle.toLowerCase().includes(q)
    );
  }, [apps, searchQuery]);

  const handleLink = async (appId: string) => {
    if (!resumeId) return;
    await updateApplication(appId, { resumeId } as any);
    setOpen(false);
    setSearchQuery('');
    fetchApps();
  };

  const handleUnlink = async () => {
    if (!linkedApp) return;
    await updateApplication(linkedApp._id, { resumeId: null } as any);
    setLinkedApp(null);
    fetchApps();
  };

  if (!resumeId) return null;

  if (linkedApp) {
    return (
      <div className="toolbar-link-wrapper" ref={wrapRef}>
        <span className="toolbar-linked-app" title={`Linked to: ${linkedApp.company} - ${linkedApp.jobTitle}`}>
          {linkedApp.company} - {linkedApp.jobTitle}
        </span>
        <button
          className="toolbar-unlink-btn"
          onClick={handleUnlink}
          title="Unlink from this application"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="toolbar-link-wrapper" ref={wrapRef}>
      <button onClick={() => { setOpen(!open); if (!open) { fetchApps(); setSearchQuery(''); setTimeout(() => searchRef.current?.focus(), 0); } }}>
        Link to Job
      </button>
      {open && (
        <div className="toolbar-link-menu">
          <input
            ref={searchRef}
            className="searchable-select-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs..."
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: '8px 8px 0 0' }}
          />
          {unlinkedApps.length === 0 ? (
            <div className="toolbar-link-empty">
              {apps.filter((a) => !a.resumeId).length === 0 ? 'No unlinked applications' : 'No matches'}
            </div>
          ) : (
            unlinkedApps.map((a) => (
              <button key={a._id} onClick={() => handleLink(a._id)}>
                {a.company} - {a.jobTitle}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EditableResumeName({ name, onRename }: { name: string; onRename?: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setDraft(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [name]);

  const commit = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name && onRename) {
      onRename(trimmed);
    }
  }, [draft, name, onRename]);

  if (!editing) {
    return (
      <span
        className="toolbar-resume-name"
        onClick={startEditing}
        title="Click to rename"
        style={{ cursor: 'pointer' }}
      >
        {name}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      className="toolbar-resume-name-input"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(false);
      }}
      autoFocus
    />
  );
}

interface Props {
  onShowList: () => void;
  onSaveAsVersion: () => void;
  onRename?: (name: string) => void;
  view?: AppView;
  onViewChange?: (view: AppView) => void;
  showList?: boolean;
}

export function Toolbar({ onShowList, onSaveAsVersion, onRename, view = 'editor', onViewChange, showList }: Props) {
  const data = useResumeStore((s) => s.data);
  const resumeName = useResumeStore((s) => s.resumeName);
  const mongoId = useResumeStore((s) => s.mongoId);
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

      {/* Center: resume name + linked job (hidden on list view) */}
      {isEditor && !showList && resumeName && (
        <div className="toolbar-center">
          <EditableResumeName name={resumeName} onRename={onRename} />
          <LinkToJob resumeId={mongoId} />
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

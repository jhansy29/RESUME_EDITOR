import { useEffect, useState } from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { Toolbar } from './Toolbar';
import { FormatToolbar } from './FormatToolbar';
import { SectionSidebar } from './SectionSidebar';
import { FormEditor } from '../FormEditor/FormEditor';
import { ResumePreview } from '../ResumePreview/ResumePreview';
import { ResumeList } from './ResumeList';
import { VaultView } from '../Vault/VaultView';
import { JDAnalyzerPanel } from '../JDAnalyzer/JDAnalyzerPanel';
import { SuggestionsPanel } from '../Suggestions/SuggestionsPanel';
import { HomePage } from './HomePage';
import { ApplicationTracker } from '../Tracker/ApplicationTracker';
import { listResumes, getResume, createResume, duplicateResume, deleteResume, type ResumeMeta } from '../../api/resumeApi';
import { getTemplate } from '../../api/templateApi';
import { sampleResume } from '../../data/sampleResume';
import type { ResumeData } from '../../types/resume';
import '../../styles/app.css';

export type AppView = 'home' | 'editor' | 'vault' | 'jd-analyzer' | 'tracker';

export function AppShell() {
  const activeSection = useResumeStore((s) => s.activeSection);
  const loadData = useResumeStore((s) => s.loadData);
  const setMongoId = useResumeStore((s) => s.setMongoId);
  const setResumeName = useResumeStore((s) => s.setResumeName);
  const setLoading = useResumeStore((s) => s.setLoading);
  const loading = useResumeStore((s) => s.loading);
  const mongoId = useResumeStore((s) => s.mongoId);

  const [resumes, setResumes] = useState<ResumeMeta[]>([]);
  const [showList, setShowList] = useState(false);

  // Parse initial view and resume ID from URL hash
  const parseHash = (): { view: AppView; resumeId: string | null } => {
    const hash = window.location.hash.slice(1); // remove #
    const params = new URLSearchParams(hash);
    const v = params.get('view') as AppView | null;
    const validViews: AppView[] = ['home', 'editor', 'vault', 'jd-analyzer', 'tracker'];
    return {
      view: v && validViews.includes(v) ? v : 'home',
      resumeId: params.get('resume'),
    };
  };

  const initialHash = parseHash();
  const [view, setView] = useState<AppView>(initialHash.view);

  // Sync view + resume ID to URL hash
  const updateHash = (v: AppView, resumeId?: string | null) => {
    const params = new URLSearchParams();
    params.set('view', v);
    if (resumeId) params.set('resume', resumeId);
    window.location.hash = params.toString();
  };

  // On mount: restore state from hash
  useEffect(() => {
    const { view: hashView, resumeId } = parseHash();
    listResumes()
      .then(async (list) => {
        setResumes(list);
        // If hash points to editor/jd-analyzer with a specific resume, restore it
        if ((hashView === 'editor' || hashView === 'jd-analyzer') && resumeId) {
          try {
            const doc = await getResume(resumeId);
            const { _id, name, __v, createdAt, updatedAt, ...data } = doc;
            loadData(data as ResumeData);
            setMongoId(_id);
            if (name) setResumeName(name);
            setShowList(false);
          } catch {
            // Resume not found, show list
            setShowList(true);
          }
        } else if (hashView === 'editor') {
          setShowList(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleNavigate = async (target: AppView) => {
    if (target === 'editor') {
      // Always show resume list first so user picks which resume to edit
      const list = await listResumes();
      setResumes(list);
      setShowList(true);
    }
    setView(target);
    updateHash(target, (target === 'editor' || target === 'jd-analyzer') ? mongoId : null);
  };

  const handleSelectResume = async (id: string) => {
    const doc = await getResume(id);
    const { _id, name, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
    if (name) setResumeName(name);
    setShowList(false);
    updateHash('editor', _id);
  };

  const handleCreateResume = async (name: string) => {
    const doc = await createResume({ ...sampleResume, name });
    const { _id, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
    setResumeName(name);
    setResumes(await listResumes());
    setShowList(false);
    updateHash('editor', _id);
  };

  const handleDuplicateResume = async (id: string, name?: string) => {
    const doc = await duplicateResume(id, name);
    const { _id, name: docName, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
    if (docName) setResumeName(docName);
    setResumes(await listResumes());
    updateHash('editor', _id);
  };

  const handleDeleteResume = async (id: string) => {
    await deleteResume(id);
    setResumes(await listResumes());
  };

  const handleSaveAsVersion = async () => {
    if (!mongoId) return;
    const versionName = prompt('Name for the new version:');
    if (!versionName) return;
    const doc = await duplicateResume(mongoId, versionName);
    const { _id, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
    setResumeName(versionName);
    setResumes(await listResumes());
    updateHash('editor', _id);
  };

  const handleApplyTemplate = async (templateId: string, resumeName: string) => {
    const template = await getTemplate(templateId);
    const resumeData: Record<string, unknown> = {
      ...(template.resumeData || {}),
      name: resumeName,
      format: template.format,
      layout: template.layout,
      css: template.css || '',
      sectionOrder: template.sectionOrder,
    };
    const doc = await createResume(resumeData);
    const { _id, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
    setResumeName(resumeName);
    setResumes(await listResumes());
    setShowList(false);
    updateHash('editor', _id);
  };

  const handleRefreshList = async () => {
    setResumes(await listResumes());
    setShowList(true);
  };

  if (loading) {
    return <div className="app-shell"><div className="loading">Loading...</div></div>;
  }

  // Home page — the landing screen
  if (view === 'home') {
    return (
      <div className="app-shell">
        <HomePage onNavigate={handleNavigate} />
      </div>
    );
  }

  // Resume list picker (within editor view)
  if (view === 'editor' && showList) {
    return (
      <div className="app-shell">
        <Toolbar onShowList={handleRefreshList} onSaveAsVersion={handleSaveAsVersion} view={view} onViewChange={handleNavigate} showList />
        <ResumeList
          resumes={resumes}
          onSelect={handleSelectResume}
          onCreate={handleCreateResume}
          onDuplicate={handleDuplicateResume}
          onDelete={handleDeleteResume}
          onApplyTemplate={handleApplyTemplate}
        />
      </div>
    );
  }

  if (view === 'vault') {
    return (
      <div className="app-shell">
        <Toolbar onShowList={handleRefreshList} onSaveAsVersion={handleSaveAsVersion} view={view} onViewChange={handleNavigate} />
        <div className="main-content" style={{ flexDirection: 'column' }}>
          <VaultView />
        </div>
      </div>
    );
  }

  if (view === 'tracker') {
    return (
      <div className="app-shell">
        <Toolbar onShowList={handleRefreshList} onSaveAsVersion={handleSaveAsVersion} view={view} onViewChange={handleNavigate} />
        <div className="main-content" style={{ flexDirection: 'column', overflow: 'auto' }}>
          <ApplicationTracker />
        </div>
      </div>
    );
  }

  if (view === 'jd-analyzer') {
    return (
      <div className="app-shell">
        <Toolbar onShowList={handleRefreshList} onSaveAsVersion={handleSaveAsVersion} view={view} onViewChange={handleNavigate} />
        <div className="main-content jd-analyzer-layout">
          <div className="jd-analyzer-left">
            <JDAnalyzerPanel />
          </div>
          <div className="jd-analyzer-center">
            <ResumePreview />
          </div>
          <div className="jd-analyzer-right">
            <SuggestionsPanel />
          </div>
        </div>
      </div>
    );
  }

  // Editor view (default)
  return (
    <div className="app-shell">
      <Toolbar onShowList={handleRefreshList} onSaveAsVersion={handleSaveAsVersion} view={view} onViewChange={handleNavigate} />
      <FormatToolbar />
      <div className="main-content">
        <SectionSidebar />
        {activeSection && (
          <div className="form-panel">
            <FormEditor />
          </div>
        )}
        <div className="preview-panel">
          <ResumePreview />
        </div>
      </div>
    </div>
  );
}

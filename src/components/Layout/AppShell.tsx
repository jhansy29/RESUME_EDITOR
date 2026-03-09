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
  const setLoading = useResumeStore((s) => s.setLoading);
  const loading = useResumeStore((s) => s.loading);
  const mongoId = useResumeStore((s) => s.mongoId);

  const [resumes, setResumes] = useState<ResumeMeta[]>([]);
  const [showList, setShowList] = useState(false);
  const [view, setView] = useState<AppView>('home');

  // Pre-load resume list on mount (don't auto-navigate away from home)
  useEffect(() => {
    listResumes()
      .then((list) => {
        setResumes(list);
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
  };

  const handleSelectResume = async (id: string) => {
    const doc = await getResume(id);
    const { _id, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
    setShowList(false);
  };

  const handleCreateResume = async (name: string) => {
    const doc = await createResume({ ...sampleResume, name });
    const { _id, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
    setResumes(await listResumes());
    setShowList(false);
  };

  const handleDuplicateResume = async (id: string, name?: string) => {
    const doc = await duplicateResume(id, name);
    const { _id, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
    setResumes(await listResumes());
  };

  const handleDeleteResume = async (id: string) => {
    await deleteResume(id);
    setResumes(await listResumes());
  };

  const handleSaveAsVersion = async () => {
    if (!mongoId) return;
    const name = prompt('Name for the new version:');
    if (!name) return;
    const doc = await duplicateResume(mongoId, name);
    const { _id, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
    setResumes(await listResumes());
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
    setResumes(await listResumes());
    setShowList(false);
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
        <Toolbar onShowList={handleRefreshList} onSaveAsVersion={handleSaveAsVersion} view={view} onViewChange={handleNavigate} />
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

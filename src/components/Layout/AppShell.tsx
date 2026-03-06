import { useEffect, useState } from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { Toolbar } from './Toolbar';
import { FormatToolbar } from './FormatToolbar';
import { SectionSidebar } from './SectionSidebar';
import { FormEditor } from '../FormEditor/FormEditor';
import { ResumePreview } from '../ResumePreview/ResumePreview';
import { ResumeList } from './ResumeList';
import { listResumes, getResume, createResume, duplicateResume, deleteResume, type ResumeMeta } from '../../api/resumeApi';
import { getTemplate } from '../../api/templateApi';
import { sampleResume } from '../../data/sampleResume';
import type { ResumeData } from '../../types/resume';
import '../../styles/app.css';

export function AppShell() {
  const activeSection = useResumeStore((s) => s.activeSection);
  const loadData = useResumeStore((s) => s.loadData);
  const setMongoId = useResumeStore((s) => s.setMongoId);
  const setLoading = useResumeStore((s) => s.setLoading);
  const loading = useResumeStore((s) => s.loading);
  const mongoId = useResumeStore((s) => s.mongoId);

  const [resumes, setResumes] = useState<ResumeMeta[]>([]);
  const [showList, setShowList] = useState(true);

  // Load resume list from MongoDB on mount
  useEffect(() => {
    listResumes()
      .then(async (list) => {
        setResumes(list);
        if (list.length > 0) {
          // Auto-load most recent
          const doc = await getResume(list[0]._id);
          const { _id, __v, createdAt, updatedAt, ...data } = doc;
          loadData(data as ResumeData);
          setMongoId(_id);
          setShowList(false);
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem('resume-editor-data');
          if (raw) loadData(JSON.parse(raw));
        } catch { /* ignore */ }
        setLoading(false);
        setShowList(false);
      });
  }, []);

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
    // Stay on the list view so user can see the new copy
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
    // Use template's stored resume content + format as the starting point
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

  if (showList) {
    return (
      <div className="app-shell">
        <div className="toolbar">
          <span className="toolbar-title">Resume Editor</span>
        </div>
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

  return (
    <div className="app-shell">
      <Toolbar onShowList={handleRefreshList} onSaveAsVersion={handleSaveAsVersion} />
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

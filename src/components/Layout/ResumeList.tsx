import { useState, useEffect, useRef, useMemo } from 'react';
import type { ResumeMeta } from '../../api/resumeApi';
import { listTemplates, getTemplate, generateTemplate, deleteTemplate, type TemplateMeta } from '../../api/templateApi';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import type { ResumeData } from '../../types/resume';

interface Props {
  resumes: ResumeMeta[];
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDuplicate: (id: string, name?: string) => void;
  onDelete: (id: string) => void;
  onApplyTemplate?: (templateId: string, resumeName: string) => void;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function ResumeList({ resumes, onSelect, onCreate, onDuplicate, onDelete, onApplyTemplate }: Props) {
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [previewData, setPreviewData] = useState<{ data: ResumeData; name: string; id: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredResumes = useMemo(() => {
    if (!search.trim()) return resumes;
    const q = search.toLowerCase();
    return resumes.filter(r => r.name.toLowerCase().includes(q));
  }, [resumes, search]);

  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handlePreview = async (t: TemplateMeta) => {
    const full = await getTemplate(t._id);
    setPreviewData({
      data: { ...full.resumeData, format: full.format, css: full.css || '', sectionOrder: full.sectionOrder, layout: full.layout } as ResumeData,
      name: t.name,
      id: t._id,
    });
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
  };

  const handleDuplicate = (e: React.MouseEvent, r: ResumeMeta) => {
    e.stopPropagation();
    const name = prompt('Name for the copy:', `${r.name} (Copy)`);
    if (name === null) return;
    onDuplicate(r._id, name || undefined);
  };

  const handleDelete = (e: React.MouseEvent, r: ResumeMeta) => {
    e.stopPropagation();
    if (!confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    onDelete(r._id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    const templateName = prompt('Name for the template:', file.name.replace(/\.[^.]+$/, '') + ' Template');
    if (!templateName) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);

    try {
      await generateTemplate({ file, name: templateName });

      const updated = await listTemplates();
      setTemplates(updated);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to generate template');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, t: TemplateMeta) => {
    e.stopPropagation();
    if (!confirm(`Delete template "${t.name}"? This cannot be undone.`)) return;
    try {
      await deleteTemplate(t._id);
      setTemplates((prev) => prev.filter((x) => x._id !== t._id));
    } catch {
      alert('Failed to delete template');
    }
  };

  const handlePasteUpload = async () => {
    const text = prompt('Paste your full resume text here:');
    if (!text?.trim()) return;

    setUploadError('');
    setUploading(true);

    try {
      const templateName = prompt('Name for the template:', 'My Resume Template');
      if (!templateName) {
        setUploading(false);
        return;
      }

      await generateTemplate({ text, name: templateName });

      const updated = await listTemplates();
      setTemplates(updated);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to generate template');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="resume-page-layout">
      {/* Left: Resumes (main area) */}
      <div className="resume-main-panel">
        <div className="resume-list-header">
          <h2>Your Resumes <span className="resume-count">{resumes.length}</span></h2>
          <div className="resume-search">
            <input
              className="search-input"
              placeholder="Search resumes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {resumes.length === 0 && <p className="empty-msg">No resumes yet. Create one to get started.</p>}
        <div className="resume-grid">
          {filteredResumes.map((r) => (
            <div key={r._id} className="resume-card" onClick={() => onSelect(r._id)}>
              <span className="resume-card-name">{r.name}</span>
              <div className="resume-card-footer">
                <span className="resume-card-date">{timeAgo(new Date(r.updatedAt))}</span>
                <div className="resume-card-actions">
                  <button
                    className="resume-action-btn duplicate"
                    title="Duplicate"
                    onClick={(e) => handleDuplicate(e, r)}
                  >
                    Copy
                  </button>
                  <button
                    className="resume-action-btn delete"
                    title="Delete"
                    onClick={(e) => handleDelete(e, r)}
                  >
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
          {search && filteredResumes.length === 0 && (
            <p className="empty-msg" style={{ gridColumn: '1 / -1' }}>No resumes match "{search}"</p>
          )}
        </div>
        <div className="create-resume">
          <input
            className="field-input"
            placeholder="New resume name (e.g. AI ML Engineer - Google)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button className="create-btn" onClick={handleCreate}>Create</button>
        </div>
      </div>

      {/* Right: Templates sidebar */}
      <div className="templates-sidebar">
        <h2>Templates</h2>

        <div className="upload-resume-section">
          <p className="upload-description">Upload a resume to auto-generate a template.</p>
          <div className="upload-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.text,.pdf,.doc,.docx"
              className="hidden-input"
              onChange={handleFileUpload}
            />
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Generating...' : 'Upload'}
            </button>
            <button
              className="upload-btn paste-btn"
              onClick={handlePasteUpload}
              disabled={uploading}
            >
              {uploading ? 'Generating...' : 'Paste Text'}
            </button>
          </div>
          {uploading && <p className="upload-status">Parsing... 15-30s</p>}
          {uploadError && <p className="upload-error">{uploadError}</p>}
        </div>

        {templates.length > 0 && (
          <div className="template-list">
            {templates.map((t) => (
              <div key={t._id} className="template-card" onClick={() => handlePreview(t)}>
                <span className="template-card-name">{t.name}</span>
                <span className="template-card-desc">{t.description}</span>
                <div className="template-card-actions">
                  <button
                    className="resume-action-btn"
                    onClick={(e) => { e.stopPropagation(); handlePreview(t); }}
                  >
                    Preview
                  </button>
                  <button
                    className="resume-action-btn duplicate"
                    onClick={(e) => {
                      e.stopPropagation();
                      const name = prompt('Name for the new resume:');
                      if (name && onApplyTemplate) onApplyTemplate(t._id, name);
                    }}
                  >
                    Use
                  </button>
                  <button
                    className="resume-action-btn delete"
                    title="Delete template"
                    onClick={(e) => handleDeleteTemplate(e, t)}
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {templates.length === 0 && !uploading && (
          <p className="empty-msg">No templates yet.</p>
        )}
      </div>

      {previewData && (
        <TemplatePreviewModal
          data={previewData.data}
          templateName={previewData.name}
          onClose={() => setPreviewData(null)}
          onUse={() => {
            setPreviewData(null);
            const name = prompt('Name for the new resume:');
            if (name && onApplyTemplate) onApplyTemplate(previewData.id, name);
          }}
        />
      )}
    </div>
  );
}

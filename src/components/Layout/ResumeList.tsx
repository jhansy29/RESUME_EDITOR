import { useState, useEffect, useRef } from 'react';
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

export function ResumeList({ resumes, onSelect, onCreate, onDuplicate, onDelete, onApplyTemplate }: Props) {
  const [newName, setNewName] = useState('');
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [previewData, setPreviewData] = useState<{ data: ResumeData; name: string; id: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="resume-list-container">
      <h2>Your Resumes</h2>
      {resumes.length === 0 && <p className="empty-msg">No resumes yet. Create one to get started.</p>}
      <div className="resume-list">
        {resumes.map((r) => (
          <div key={r._id} className="resume-list-item" onClick={() => onSelect(r._id)}>
            <div className="resume-list-info">
              <span className="resume-list-name">{r.name}</span>
              <span className="resume-list-date">
                {new Date(r.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="resume-list-actions">
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
        ))}
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

      <h2 style={{ marginTop: 32 }}>Templates</h2>

      {/* Upload section */}
      <div className="upload-resume-section">
        <p className="upload-description">Upload your resume (.pdf, .docx, or .txt) to auto-generate an editable template using AI.</p>
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
            {uploading ? 'Generating...' : 'Upload Resume'}
          </button>
          <button
            className="upload-btn paste-btn"
            onClick={handlePasteUpload}
            disabled={uploading}
          >
            {uploading ? 'Generating...' : 'Paste Resume Text'}
          </button>
        </div>
        {uploading && <p className="upload-status">AI is parsing your resume... this may take 15-30 seconds.</p>}
        {uploadError && <p className="upload-error">{uploadError}</p>}
      </div>

      {templates.length > 0 && (
        <div className="resume-list">
          {templates.map((t) => (
            <div key={t._id} className="resume-list-item template-item" onClick={() => handlePreview(t)}>
              <div className="resume-list-info">
                <span className="resume-list-name">{t.name}</span>
                <span className="resume-list-date">{t.description}</span>
              </div>
              <div className="resume-list-actions" style={{ opacity: 1 }}>
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
        <p className="empty-msg">No templates yet. Upload a resume to create one.</p>
      )}
    </div>
  );
}

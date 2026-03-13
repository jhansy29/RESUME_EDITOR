import { useEffect, useState } from 'react';
import { listResumes, type ResumeMeta } from '../../api/resumeApi';

interface Props {
  onImport: (resumeId: string) => Promise<void>;
  onClose: () => void;
}

export function VaultResumePickerModal({ onImport, onClose }: Props) {
  const [resumes, setResumes] = useState<ResumeMeta[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listResumes()
      .then(setResumes)
      .catch(() => setError('Failed to load resumes'))
      .finally(() => setFetching(false));
  }, []);

  const handleImport = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      await onImport(selected);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vault-modal-overlay" onClick={onClose}>
      <div className="vault-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vault-modal-header">
          <h3>Import from Resume</h3>
          <button className="vault-modal-close" onClick={onClose}>&times;</button>
        </div>
        <p className="vault-modal-desc">
          Select a resume to import its data into your vault. This will map contact info, education, skills, experience, and projects directly.
        </p>
        {fetching ? (
          <p style={{ padding: '1rem', textAlign: 'center' }}>Loading resumes...</p>
        ) : resumes.length === 0 ? (
          <p style={{ padding: '1rem', textAlign: 'center' }}>No resumes found. Create a resume first.</p>
        ) : (
          <div className="vault-resume-list">
            {resumes.map((r) => (
              <button
                key={r._id}
                className={`vault-resume-item ${selected === r._id ? 'selected' : ''}`}
                onClick={() => setSelected(r._id)}
              >
                <span className="vault-resume-name">{r.name}</span>
                <span className="vault-resume-date">{new Date(r.updatedAt).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        )}
        {error && <div className="vault-import-error">{error}</div>}
        <div className="vault-modal-actions">
          <button onClick={onClose} disabled={loading}>Cancel</button>
          <button className="primary" onClick={handleImport} disabled={loading || !selected}>
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

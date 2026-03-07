import { useState } from 'react';

interface Props {
  onImport: (text: string) => Promise<void>;
  onClose: () => void;
}

export function VaultImportModal({ onImport, onClose }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onImport(text);
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
          <h3>Import Master Resume</h3>
          <button className="vault-modal-close" onClick={onClose}>&times;</button>
        </div>
        <p className="vault-modal-desc">
          Paste your master resume text below. The AI will parse it into structured vault data with bullet groups, tags, and metrics.
        </p>
        <textarea
          className="vault-import-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste resume_master.txt content here..."
          rows={16}
          disabled={loading}
        />
        {error && <div className="vault-import-error">{error}</div>}
        <div className="vault-modal-actions">
          <button onClick={onClose} disabled={loading}>Cancel</button>
          <button className="primary" onClick={handleImport} disabled={loading || !text.trim()}>
            {loading ? 'Parsing with AI...' : 'Parse & Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

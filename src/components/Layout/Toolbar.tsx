import { useRef } from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { exportJson, importJson } from '../../utils/storage';
import { exportDocx } from '../../utils/docxExport';

interface Props {
  onShowList: () => void;
  onSaveAsVersion: () => void;
}

export function Toolbar({ onShowList, onSaveAsVersion }: Props) {
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

  return (
    <div className="toolbar">
      <span className="toolbar-title">Resume Editor</span>

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
    </div>
  );
}

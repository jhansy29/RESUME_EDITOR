import { useResumeStore } from '../../hooks/useResumeStore';

export function SummaryForm() {
  const summary = useResumeStore((s) => s.data.summary || '');
  const update = useResumeStore((s) => s.updateSummary);

  return (
    <div className="form-section">
      <div className="form-section-title">Professional Summary</div>
      <div className="field-group">
        <label className="field-label">Summary (3-5 lines, rewrite per JD)</label>
        <textarea
          className="field-input summary-textarea"
          rows={6}
          value={summary}
          onChange={(e) => update(e.target.value)}
          placeholder="AI/ML Engineer with 3+ years experience building production NLP pipelines..."
        />
      </div>
    </div>
  );
}

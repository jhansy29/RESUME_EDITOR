import { useSuggestionsStore } from '../../hooks/useSuggestionsStore';
import { useJDStore } from '../../hooks/useJDStore';
import { useResumeStore } from '../../hooks/useResumeStore';
import { useVaultStore } from '../../hooks/useVaultStore';
import { SuggestionCard } from './SuggestionCard';
import '../../styles/suggestions.css';

export function SuggestionsPanel() {
  const suggestions = useSuggestionsStore((s) => s.suggestions);
  const loading = useSuggestionsStore((s) => s.loading);
  const error = useSuggestionsStore((s) => s.error);
  const generate = useSuggestionsStore((s) => s.generate);
  const accept = useSuggestionsStore((s) => s.accept);
  const reject = useSuggestionsStore((s) => s.reject);
  const acceptAll = useSuggestionsStore((s) => s.acceptAll);
  const clear = useSuggestionsStore((s) => s.clear);

  const analysis = useJDStore((s) => s.analysis);
  const resumeData = useResumeStore((s) => s.data);
  const vault = useVaultStore((s) => s.vault);

  const handleGenerate = () => {
    if (!analysis) return;
    generate(analysis, vault, resumeData);
  };

  const pending = suggestions.filter((s) => s.status === 'pending').length;
  const accepted = suggestions.filter((s) => s.status === 'accepted').length;
  const rejected = suggestions.filter((s) => s.status === 'rejected').length;

  if (!analysis) {
    return (
      <div className="sug-panel">
        <div className="sug-empty">Analyze a JD first to get suggestions.</div>
      </div>
    );
  }

  return (
    <div className="sug-panel">
      <div className="sug-header">
        <h4>AI Suggestions</h4>
        <div className="sug-header-actions">
          <button className="primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : suggestions.length > 0 ? 'Regenerate' : 'Generate Suggestions'}
          </button>
          {suggestions.length > 0 && (
            <button onClick={clear} disabled={loading}>Clear</button>
          )}
        </div>
      </div>

      {error && <div className="sug-error">{error}</div>}

      {suggestions.length > 0 && (
        <>
          <div className="sug-summary-bar">
            <span>{suggestions.length} suggestions</span>
            <span className="sug-stat sug-stat-pending">{pending} pending</span>
            <span className="sug-stat sug-stat-accepted">{accepted} accepted</span>
            <span className="sug-stat sug-stat-rejected">{rejected} rejected</span>
            {pending > 0 && (
              <button className="sug-accept-all" onClick={acceptAll}>Accept All</button>
            )}
          </div>

          <div className="sug-list">
            {suggestions.map((sug) => (
              <SuggestionCard
                key={sug.id}
                suggestion={sug}
                onAccept={() => accept(sug.id)}
                onReject={() => reject(sug.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

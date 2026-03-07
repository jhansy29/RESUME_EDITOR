import { useJDStore } from '../../hooks/useJDStore';
import { useResumeStore } from '../../hooks/useResumeStore';
import { JDKeywordDisplay } from './JDKeywordDisplay';
import { ATSScoreCard } from './ATSScoreCard';
import '../../styles/jd.css';

export function JDAnalyzerPanel() {
  const jdText = useJDStore((s) => s.jdText);
  const setJDText = useJDStore((s) => s.setJDText);
  const analysis = useJDStore((s) => s.analysis);
  const loading = useJDStore((s) => s.loading);
  const error = useJDStore((s) => s.error);
  const analyze = useJDStore((s) => s.analyze);
  const rescore = useJDStore((s) => s.rescore);
  const clearAnalysis = useJDStore((s) => s.clearAnalysis);
  const mongoId = useResumeStore((s) => s.mongoId);

  const handleAnalyze = () => {
    analyze(mongoId || undefined);
  };

  const handleRescore = () => {
    if (mongoId) rescore(mongoId);
  };

  return (
    <div className="jd-panel">
      <div className="jd-input-section">
        <div className="jd-input-header">
          <h3>Job Description Analyzer</h3>
          {analysis && (
            <button className="jd-clear-btn" onClick={clearAnalysis}>Clear</button>
          )}
        </div>
        <textarea
          className="jd-textarea"
          value={jdText}
          onChange={(e) => setJDText(e.target.value)}
          placeholder="Paste a job description here..."
          rows={analysis ? 6 : 14}
          disabled={loading}
        />
        <div className="jd-actions">
          <button className="primary" onClick={handleAnalyze} disabled={loading || !jdText.trim()}>
            {loading ? 'Analyzing...' : analysis ? 'Re-Analyze' : 'Analyze JD'}
          </button>
          {analysis && mongoId && (
            <button onClick={handleRescore} disabled={loading}>
              Re-Score Resume
            </button>
          )}
        </div>
        {error && <div className="jd-error">{error}</div>}
      </div>

      {analysis && (
        <div className="jd-results">
          <div className="jd-result-header">
            <h4>{analysis.jobTitle}</h4>
            {analysis.company && <span className="jd-company">{analysis.company}</span>}
            <span className="jd-role-type">{analysis.roleType.replace(/_/g, ' ')}</span>
          </div>

          {analysis.atsScore && <ATSScoreCard score={analysis.atsScore} />}

          <JDKeywordDisplay
            mustHave={analysis.keywords.mustHave}
            niceToHave={analysis.keywords.niceToHave}
            atsScore={analysis.atsScore}
          />

          {analysis.requirements.technical.length > 0 && (
            <div className="jd-requirements">
              <h5>Technical Requirements</h5>
              <ul>
                {analysis.requirements.technical.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.outcomeLanguage.length > 0 && (
            <div className="jd-outcomes">
              <h5>Outcome Language</h5>
              <div className="jd-outcome-chips">
                {analysis.outcomeLanguage.map((o, i) => (
                  <span key={i} className="jd-outcome-chip">{o}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

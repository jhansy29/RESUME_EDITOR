import { useState, useEffect } from 'react';
import { useJDStore } from '../../hooks/useJDStore';
import { useResumeStore } from '../../hooks/useResumeStore';
import { useSuggestionsStore } from '../../hooks/useSuggestionsStore';
import { useVaultStore } from '../../hooks/useVaultStore';
import { listResumes, getResume, duplicateResume, type ResumeMeta } from '../../api/resumeApi';
import { JDKeywordDisplay } from './JDKeywordDisplay';
import { ATSScoreCard } from './ATSScoreCard';
import type { ResumeData } from '../../types/resume';
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

  // Saved JDs
  const savedJDs = useJDStore((s) => s.savedJDs);
  const activeJDId = useJDStore((s) => s.activeJDId);
  const loadSavedJDs = useJDStore((s) => s.loadSavedJDs);
  const loadSavedJD = useJDStore((s) => s.loadSavedJD);
  const saveCurrentJD = useJDStore((s) => s.saveCurrentJD);
  const updateCurrentJD = useJDStore((s) => s.updateCurrentJD);
  const removeSavedJD = useJDStore((s) => s.removeSavedJD);

  // Resume selection
  const mongoId = useResumeStore((s) => s.mongoId);
  const loadData = useResumeStore((s) => s.loadData);
  const setMongoId = useResumeStore((s) => s.setMongoId);
  const resumeData = useResumeStore((s) => s.data);

  // Suggestions
  const generateSuggestions = useSuggestionsStore((s) => s.generate);
  const sugLoading = useSuggestionsStore((s) => s.loading);
  const vault = useVaultStore((s) => s.vault);

  const [resumes, setResumes] = useState<ResumeMeta[]>([]);
  const [showSaveJD, setShowSaveJD] = useState(false);
  const [jdTitle, setJdTitle] = useState('');
  const [jdCompany, setJdCompany] = useState('');
  const [saveAsName, setSaveAsName] = useState('');
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load resumes and saved JDs on mount
  useEffect(() => {
    listResumes().then(setResumes).catch(() => {});
    loadSavedJDs();
  }, []);

  const handleSelectResume = async (id: string) => {
    const doc = await getResume(id);
    const { _id, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
  };

  const handleAnalyze = async () => {
    await analyze(mongoId || undefined);
  };

  const handleAnalyzeAndScore = async () => {
    await analyze(mongoId || undefined);
    // After analysis, auto-generate suggestions
    const currentAnalysis = useJDStore.getState().analysis;
    if (currentAnalysis && vault) {
      generateSuggestions(currentAnalysis, vault, resumeData);
    }
  };

  const handleRescore = async () => {
    if (!mongoId) return;
    await rescore(mongoId);
    const currentAnalysis = useJDStore.getState().analysis;
    if (currentAnalysis && vault) {
      generateSuggestions(currentAnalysis, vault, resumeData);
    }
  };

  const handleSaveJD = async () => {
    if (!jdTitle.trim()) return;
    await saveCurrentJD(jdTitle.trim(), jdCompany.trim() || undefined);
    setShowSaveJD(false);
    setJdTitle('');
    setJdCompany('');
  };

  const handleSaveResumeAs = async () => {
    if (!mongoId || !saveAsName.trim()) return;
    setSaving(true);
    try {
      const doc = await duplicateResume(mongoId, saveAsName.trim());
      const { _id, __v, createdAt, updatedAt, ...data } = doc;
      loadData(data as ResumeData);
      setMongoId(_id);
      setResumes(await listResumes());
      setShowSaveAs(false);
      setSaveAsName('');
    } catch { /* ignore */ }
    setSaving(false);
  };

  const resumeName = resumes.find((r) => r._id === mongoId)?.name;

  return (
    <div className="jd-panel">
      {/* Resume Selector */}
      <div className="jd-section-card">
        <div className="jd-section-label">Resume</div>
        <select
          className="jd-select"
          value={mongoId || ''}
          onChange={(e) => e.target.value && handleSelectResume(e.target.value)}
        >
          <option value="">-- Select a resume --</option>
          {resumes.map((r) => (
            <option key={r._id} value={r._id}>{r.name}</option>
          ))}
        </select>
        {mongoId && (
          <div className="jd-resume-actions">
            <button className="jd-small-btn" onClick={() => setShowSaveAs(true)}>Save as New Version</button>
          </div>
        )}
        {showSaveAs && (
          <div className="jd-inline-form">
            <input
              className="jd-inline-input"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              placeholder="New resume name..."
              onKeyDown={(e) => e.key === 'Enter' && handleSaveResumeAs()}
            />
            <button className="jd-small-btn primary" onClick={handleSaveResumeAs} disabled={saving || !saveAsName.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="jd-small-btn" onClick={() => setShowSaveAs(false)}>Cancel</button>
          </div>
        )}
      </div>

      {/* Saved JDs Selector */}
      <div className="jd-section-card">
        <div className="jd-section-label">Saved Job Descriptions</div>
        {savedJDs.length > 0 ? (
          <div className="jd-saved-list">
            {savedJDs.map((jd) => (
              <div
                key={jd._id}
                className={`jd-saved-item${activeJDId === jd._id ? ' active' : ''}`}
                onClick={() => loadSavedJD(jd._id)}
              >
                <div className="jd-saved-item-info">
                  <span className="jd-saved-item-title">{jd.title}</span>
                  {jd.company && <span className="jd-saved-item-company">{jd.company}</span>}
                </div>
                <button
                  className="jd-saved-item-delete"
                  onClick={(e) => { e.stopPropagation(); removeSavedJD(jd._id); }}
                  title="Delete"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="jd-saved-empty">No saved JDs yet</div>
        )}
      </div>

      {/* JD Input */}
      <div className="jd-section-card">
        <div className="jd-input-header">
          <div className="jd-section-label">Job Description</div>
          <div className="jd-input-header-actions">
            {jdText.trim() && !activeJDId && (
              <button className="jd-small-btn" onClick={() => setShowSaveJD(true)}>Save JD</button>
            )}
            {activeJDId && (
              <button className="jd-small-btn" onClick={updateCurrentJD}>Update Saved</button>
            )}
            {analysis && (
              <button className="jd-small-btn" onClick={clearAnalysis}>Clear</button>
            )}
          </div>
        </div>

        {showSaveJD && (
          <div className="jd-inline-form">
            <input
              className="jd-inline-input"
              value={jdTitle}
              onChange={(e) => setJdTitle(e.target.value)}
              placeholder="Job title (e.g. ML Engineer at Google)"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveJD()}
            />
            <input
              className="jd-inline-input short"
              value={jdCompany}
              onChange={(e) => setJdCompany(e.target.value)}
              placeholder="Company"
            />
            <button className="jd-small-btn primary" onClick={handleSaveJD} disabled={!jdTitle.trim()}>Save</button>
            <button className="jd-small-btn" onClick={() => setShowSaveJD(false)}>Cancel</button>
          </div>
        )}

        <textarea
          className="jd-textarea"
          value={jdText}
          onChange={(e) => setJDText(e.target.value)}
          placeholder="Paste a job description here..."
          rows={analysis ? 6 : 12}
          disabled={loading}
        />

        <div className="jd-actions">
          <button
            className="primary"
            onClick={handleAnalyzeAndScore}
            disabled={loading || sugLoading || !jdText.trim() || !mongoId}
            title={!mongoId ? 'Select a resume first' : ''}
          >
            {loading ? 'Analyzing...' : analysis ? 'Re-Analyze & Score' : 'Analyze & Score'}
          </button>
          {!mongoId && jdText.trim() && (
            <button onClick={handleAnalyze} disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze Only'}
            </button>
          )}
          {analysis && mongoId && (
            <button onClick={handleRescore} disabled={loading || sugLoading}>
              Re-Score Resume
            </button>
          )}
        </div>
        {!mongoId && <div className="jd-hint">Select a resume above to enable scoring</div>}
        {error && <div className="jd-error">{error}</div>}
      </div>

      {/* Analysis Results */}
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

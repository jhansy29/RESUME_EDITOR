import { useState, useEffect } from 'react';
import { useJDStore } from '../../hooks/useJDStore';
import { useResumeStore } from '../../hooks/useResumeStore';
import { useSuggestionsStore } from '../../hooks/useSuggestionsStore';
import { useVaultStore } from '../../hooks/useVaultStore';
import { listResumes, getResume, duplicateResume, type ResumeMeta } from '../../api/resumeApi';
import { listApplications } from '../../api/applicationsApi';
import { applyTailorChanges } from '../../utils/applyTailorChanges';
import { JDKeywordDisplay } from './JDKeywordDisplay';
import { ATSScoreCard } from './ATSScoreCard';
import { JobscanScoreCard } from './JobscanScoreCard';
import { TailorPreview } from './TailorPreview';
import { WorkflowStepper } from './WorkflowStepper';
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

  // Workflow
  const workflowStep = useJDStore((s) => s.workflowStep);

  // Tailor
  const tailorResult = useJDStore((s) => s.tailorResult);
  const tailorLoading = useJDStore((s) => s.tailorLoading);
  const tailorAccepted = useJDStore((s) => s.tailorAccepted);
  const generateTailor = useJDStore((s) => s.generateTailor);
  const clearTailor = useJDStore((s) => s.clearTailor);

  // Iteration loop
  const iterationCount = useJDStore((s) => s.iterationCount);
  const scoreHistory = useJDStore((s) => s.scoreHistory);
  const recordAppliedChanges = useJDStore((s) => s.recordAppliedChanges);
  const recordScanResult = useJDStore((s) => s.recordScanResult);
  const generateNextIteration = useJDStore((s) => s.generateNextIteration);

  // Jobscan
  const jobscanReport = useJDStore((s) => s.jobscanReport);
  const jobscanLoading = useJDStore((s) => s.jobscanLoading);
  const jobscanError = useJDStore((s) => s.jobscanError);
  const runJobscanScan = useJDStore((s) => s.runJobscanScan);
  const runJobscanRescan = useJDStore((s) => s.runJobscanRescan);
  const checkJobscanStatus = useJDStore((s) => s.checkJobscanStatus);
  const jobscanStatus = useJDStore((s) => s.jobscanStatus);

  // Fetch from URL
  const fetchFromUrl = useJDStore((s) => s.fetchFromUrl);
  const fetchUrlLoading = useJDStore((s) => s.fetchUrlLoading);

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
  const flushSave = useResumeStore((s) => s.flushSave);

  // Resume store mutation methods for applying tailored changes
  const updateSummary = useResumeStore((s) => s.updateSummary);
  const updateSkillRow = useResumeStore((s) => s.updateSkillRow);
  const addSkillRow = useResumeStore((s) => s.addSkillRow);
  const updateBullet = useResumeStore((s) => s.updateBullet);
  const reorderBullets = useResumeStore((s) => s.reorderBullets);
  const removeBullet = useResumeStore((s) => s.removeBullet);
  const insertBulletAfter = useResumeStore((s) => s.insertBulletAfter);
  const addBullet = useResumeStore((s) => s.addBullet);
  const addProject = useResumeStore((s) => s.addProject);
  const updateProject = useResumeStore((s) => s.updateProject);
  const removeProject = useResumeStore((s) => s.removeProject);

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
  const [jdUrl, setJdUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [trackerApps, setTrackerApps] = useState<Array<{ _id: string; jobTitle: string; company: string; url: string }>>([]);
  const [showTracker, setShowTracker] = useState(false);
  const [applyingAndScanning, setApplyingAndScanning] = useState(false);

  // Load resumes and saved JDs on mount
  useEffect(() => {
    listResumes().then(setResumes).catch(() => {});
    loadSavedJDs();
    checkJobscanStatus();
  }, []);

  const handleFetchUrl = async () => {
    if (!jdUrl.trim()) return;
    await fetchFromUrl(jdUrl.trim());
    setShowUrlInput(false);
    setJdUrl('');
  };

  const handleImportFromTracker = async () => {
    if (!showTracker) {
      try {
        const apps = await listApplications();
        setTrackerApps(apps.filter(a => a.url).map(a => ({ _id: a._id, jobTitle: a.jobTitle, company: a.company, url: a.url })));
      } catch { /* ignore */ }
    }
    setShowTracker(!showTracker);
  };

  const handleSelectTrackerApp = async (url: string) => {
    setShowTracker(false);
    await fetchFromUrl(url);
  };

  const handleSelectResume = async (id: string) => {
    const doc = await getResume(id);
    const { _id, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
  };

  const handleRunATSScan = async () => {
    if (!mongoId) return;
    if (jobscanStatus?.onMatchReport) {
      await runJobscanRescan(mongoId);
    } else {
      await runJobscanScan(mongoId);
    }
    // Record the score after scan completes
    const report = useJDStore.getState().jobscanReport;
    if (report) {
      recordScanResult(report.matchRate);
    }
  };

  const handleAnalyzeKeywords = async () => {
    await analyze(mongoId || undefined);
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

  const handleOptimize = async () => {
    if (!mongoId) return;
    if (!vault || (!vault.experience?.length && !vault.projects?.length && !vault.skills?.length)) {
      useJDStore.setState({ error: 'Populate your Profile Vault first to enable smart tailoring. Go to the Vault page to import your master resume data.' });
      return;
    }
    await generateTailor(mongoId);
  };

  const doApplyChanges = (): string[] => {
    if (!tailorResult) return [];
    const storeMethods = {
      updateSummary, updateSkillRow, addSkillRow, updateBullet,
      reorderBullets, removeBullet, insertBulletAfter, addBullet,
      addProject, updateProject, removeProject,
    };
    const applied = applyTailorChanges(
      tailorResult,
      tailorAccepted,
      resumeData,
      storeMethods,
      () => useResumeStore.getState().data.skills,
    );
    return applied;
  };

  const handleApplyTailorChanges = () => {
    doApplyChanges();
    clearTailor();
  };

  const handleApplyAndScan = async () => {
    if (!mongoId || !tailorResult) return;
    setApplyingAndScanning(true);
    useJDStore.setState({ workflowStep: 'applying' });

    try {
      // 1. Apply accepted changes
      const applied = doApplyChanges();
      recordAppliedChanges(applied);

      // 2. Flush save to MongoDB
      await flushSave();

      // 3. Clear tailor preview
      useJDStore.setState({ tailorResult: null, tailorAccepted: {}, workflowStep: 'scanning' });

      // 4. Run Jobscan scan
      if (jobscanStatus?.onMatchReport) {
        await runJobscanRescan(mongoId);
      } else {
        await runJobscanScan(mongoId);
      }

      // 5. Record the score
      const report = useJDStore.getState().jobscanReport;
      if (report) {
        recordScanResult(report.matchRate);
      }
    } catch {
      // Errors are handled by the store actions
    } finally {
      setApplyingAndScanning(false);
    }
  };

  const handleContinueOptimizing = async () => {
    if (!mongoId) return;
    await generateNextIteration(mongoId);
  };

  const handleRunJobscan = async () => {
    if (!mongoId) return;
    if (jobscanStatus?.onMatchReport) {
      await runJobscanRescan(mongoId);
    } else {
      await runJobscanScan(mongoId);
    }
    const report = useJDStore.getState().jobscanReport;
    if (report) {
      recordScanResult(report.matchRate);
    }
  };

  return (
    <div className="jd-panel">
      {/* Workflow Stepper */}
      {workflowStep !== 'input' && <WorkflowStepper current={workflowStep} iterationCount={iterationCount} />}

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

        {/* Import JD from URL or Application Tracker */}
        <div className="jd-import-row">
          <button
            className="jd-small-btn"
            onClick={() => { setShowUrlInput(!showUrlInput); setShowTracker(false); }}
            disabled={fetchUrlLoading}
          >
            {fetchUrlLoading ? 'Fetching...' : 'Fetch from URL'}
          </button>
          <button
            className="jd-small-btn"
            onClick={handleImportFromTracker}
            disabled={fetchUrlLoading}
          >
            Import from Tracker
          </button>
        </div>

        {showUrlInput && (
          <div className="jd-inline-form">
            <input
              className="jd-inline-input"
              value={jdUrl}
              onChange={(e) => setJdUrl(e.target.value)}
              placeholder="Paste job posting URL..."
              onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
              disabled={fetchUrlLoading}
            />
            <button className="jd-small-btn primary" onClick={handleFetchUrl} disabled={fetchUrlLoading || !jdUrl.trim()}>
              {fetchUrlLoading ? 'Fetching...' : 'Fetch'}
            </button>
            <button className="jd-small-btn" onClick={() => setShowUrlInput(false)}>Cancel</button>
          </div>
        )}

        {showTracker && trackerApps.length > 0 && (
          <div className="jd-tracker-list">
            {trackerApps.map((app) => (
              <div
                key={app._id}
                className="jd-tracker-item"
                onClick={() => handleSelectTrackerApp(app.url)}
              >
                <span className="jd-tracker-item-title">{app.jobTitle}</span>
                <span className="jd-tracker-item-company">{app.company}</span>
              </div>
            ))}
          </div>
        )}

        {showTracker && trackerApps.length === 0 && (
          <div className="jd-saved-empty">No tracked applications with URLs</div>
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
            onClick={handleRunATSScan}
            disabled={jobscanLoading || !jdText.trim() || !mongoId}
            title={!mongoId ? 'Select a resume first' : ''}
          >
            {jobscanLoading ? 'Scanning...' : 'Run ATS Scan'}
          </button>
          <button
            onClick={handleAnalyzeKeywords}
            disabled={loading || sugLoading || !jdText.trim()}
          >
            {loading ? 'Analyzing...' : 'Analyze Keywords'}
          </button>
        </div>
        {!mongoId && <div className="jd-hint">Select a resume above to run ATS scan</div>}
        {error && <div className="jd-error">{error}</div>}
      </div>

      {/* Score Progression */}
      {scoreHistory.length > 0 && (
        <div className="jd-section-card">
          <div className="jd-section-label">Score Progression</div>
          <div className="jd-score-progression">
            {scoreHistory.map((s, i) => (
              <span key={i} className="jd-score-progression-item">
                <span className={`jd-score-chip ${s.score >= 90 ? 'green' : s.score >= 70 ? 'yellow' : 'red'}`}>
                  R{s.round}: {s.score}%
                </span>
                {i < scoreHistory.length - 1 && <span className="jd-score-arrow">&rarr;</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Jobscan ATS Results (primary - no AI needed) */}
      {(jobscanLoading || applyingAndScanning) && (
        <div className="jd-section-card">
          <div className="jd-loading-card">
            <div className="jd-spinner" />
            <span>
              {applyingAndScanning && workflowStep === 'applying'
                ? 'Applying changes and saving...'
                : 'Running Jobscan ATS scan (this takes ~30s)...'}
            </span>
          </div>
        </div>
      )}

      {jobscanError && <div className="jd-section-card"><div className="jd-error">{jobscanError}</div></div>}

      {jobscanReport && workflowStep === 'results' && (
        <div className="jd-section-card jscan-results-section">
          <JobscanScoreCard report={jobscanReport} />

          {jobscanReport.matchRate < 90 && mongoId && (
            <div className="jscan-reoptimize">
              <p className="jscan-reoptimize-msg">
                Score is {jobscanReport.matchRate}% (target: 90%+).
                {jobscanReport.hardSkills.missing.length > 0 &&
                  ` Missing: ${jobscanReport.hardSkills.missing.slice(0, 5).join(', ')}${jobscanReport.hardSkills.missing.length > 5 ? '...' : ''}`
                }
              </p>
              <div className="jscan-reoptimize-actions">
                <button className="jd-optimize-btn" onClick={handleContinueOptimizing} disabled={tailorLoading}>
                  {tailorLoading ? 'Optimizing...' : `Continue Optimizing (Round ${iterationCount + 1})`}
                </button>
                <button className="jd-jobscan-btn" onClick={handleRunJobscan} disabled={jobscanLoading}>
                  {jobscanLoading ? 'Scanning...' : 'Re-Scan Only'}
                </button>
              </div>
            </div>
          )}

          {jobscanReport.matchRate >= 90 && (
            <div className="jscan-success">
              ATS score is {jobscanReport.matchRate}% - ready to apply!
              {scoreHistory.length > 1 && (
                <span className="jscan-success-progression">
                  {' '}(improved from {scoreHistory[0].score}% in {scoreHistory.length} rounds)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tailor Preview */}
      {(workflowStep === 'tailor-preview' || workflowStep === 'tailoring') && tailorResult && (
        <TailorPreview
          result={tailorResult}
          onApply={handleApplyTailorChanges}
          onApplyAndScan={handleApplyAndScan}
          iterationCount={iterationCount}
        />
      )}

      {tailorLoading && (
        <div className="jd-section-card">
          <div className="jd-loading-card">
            <div className="jd-spinner" />
            <span>Generating optimized resume{iterationCount > 1 ? ` (Round ${iterationCount})` : ''}...</span>
          </div>
        </div>
      )}

      {/* AI Keyword Analysis (secondary) */}
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

          {/* Optimize button in analysis section */}
          {mongoId && !tailorResult && !tailorLoading && workflowStep === 'analyzed' && (
            <div className="jd-optimize-section">
              <button className="jd-optimize-btn" onClick={handleOptimize} disabled={tailorLoading}>
                Optimize Resume for This JD
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

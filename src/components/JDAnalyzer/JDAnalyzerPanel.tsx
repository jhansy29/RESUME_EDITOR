import { useState, useEffect } from 'react';
import { useJDStore } from '../../hooks/useJDStore';
import { useResumeStore } from '../../hooks/useResumeStore';
import { useSuggestionsStore } from '../../hooks/useSuggestionsStore';
import { useVaultStore } from '../../hooks/useVaultStore';
import { listResumes, getResume, duplicateResume, type ResumeMeta } from '../../api/resumeApi';
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

  // Jobscan
  const jobscanReport = useJDStore((s) => s.jobscanReport);
  const jobscanLoading = useJDStore((s) => s.jobscanLoading);
  const jobscanError = useJDStore((s) => s.jobscanError);
  const runJobscanScan = useJDStore((s) => s.runJobscanScan);
  const runJobscanRescan = useJDStore((s) => s.runJobscanRescan);
  const checkJobscanStatus = useJDStore((s) => s.checkJobscanStatus);
  const jobscanStatus = useJDStore((s) => s.jobscanStatus);

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

  // Resume store mutation methods for applying tailored changes
  const updateSummary = useResumeStore((s) => s.updateSummary);
  const updateSkillRow = useResumeStore((s) => s.updateSkillRow);
  const addSkillRow = useResumeStore((s) => s.addSkillRow);
  const updateBullet = useResumeStore((s) => s.updateBullet);
  const reorderBullets = useResumeStore((s) => s.reorderBullets);

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
    checkJobscanStatus();
  }, []);

  const handleSelectResume = async (id: string) => {
    const doc = await getResume(id);
    const { _id, __v, createdAt, updatedAt, ...data } = doc;
    loadData(data as ResumeData);
    setMongoId(_id);
  };

  const handleAnalyzeAndScore = async () => {
    await analyze(mongoId || undefined);
    const currentAnalysis = useJDStore.getState().analysis;
    if (currentAnalysis && vault) {
      generateSuggestions(currentAnalysis, vault, resumeData);
    }
  };

  const handleAnalyze = async () => {
    await analyze(mongoId || undefined);
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

  const handleOptimize = async () => {
    if (!mongoId) return;
    await generateTailor(mongoId);
  };

  const handleApplyTailorChanges = () => {
    if (!tailorResult) return;

    // Apply summary
    if (tailorAccepted['summary'] && tailorResult.summary) {
      updateSummary(tailorResult.summary);
    }

    // Apply skills
    if (tailorAccepted['skills'] && tailorResult.skills) {
      for (const newSkill of tailorResult.skills) {
        const existing = resumeData.skills.find((s) => s.id === newSkill.id);
        if (existing) {
          if (existing.category !== newSkill.category) updateSkillRow(existing.id, 'category', newSkill.category);
          if (existing.skills !== newSkill.skills) updateSkillRow(existing.id, 'skills', newSkill.skills);
        } else {
          // New skill row: add it then update
          addSkillRow();
          // Get the latest skills array to find the newly added row
          const latestSkills = useResumeStore.getState().data.skills;
          const addedRow = latestSkills[latestSkills.length - 1];
          if (addedRow) {
            updateSkillRow(addedRow.id, 'category', newSkill.category);
            updateSkillRow(addedRow.id, 'skills', newSkill.skills);
          }
        }
      }
    }

    // Apply bullet changes
    if (tailorResult.bulletChanges) {
      for (const bc of tailorResult.bulletChanges) {
        if (!tailorAccepted[bc.bulletId]) continue;
        updateBullet(bc.entryId, bc.bulletId, bc.revised, bc.section);
      }
    }

    // Apply bullet reorders
    if (tailorResult.bulletReorders) {
      for (const br of tailorResult.bulletReorders) {
        if (!tailorAccepted[`reorder-${br.entryId}`]) continue;
        const entry = br.section === 'experience'
          ? resumeData.experience.find((e) => e.id === br.entryId)
          : resumeData.projects.find((p) => p.id === br.entryId);
        if (!entry) continue;

        // Apply reorder by moving bullets to match the target order
        const currentBullets = entry.bullets;
        for (let targetIdx = 0; targetIdx < br.bulletIds.length; targetIdx++) {
          const bulletId = br.bulletIds[targetIdx];
          const currentIdx = currentBullets.findIndex((b) => b.id === bulletId);
          if (currentIdx !== -1 && currentIdx !== targetIdx) {
            reorderBullets(br.entryId, currentIdx, targetIdx, br.section);
          }
        }
      }
    }

    // Move to analyzed step (changes applied)
    clearTailor();
  };

  const handleRunJobscan = async () => {
    if (!mongoId) return;
    // Check if we can do a rescan (already on match report)
    if (jobscanStatus?.onMatchReport) {
      await runJobscanRescan(mongoId);
    } else {
      await runJobscanScan(mongoId);
    }
  };

  const handleReoptimize = async () => {
    if (!mongoId) return;
    await generateTailor(mongoId);
  };

  return (
    <div className="jd-panel">
      {/* Workflow Stepper */}
      {workflowStep !== 'input' && <WorkflowStepper current={workflowStep} />}

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

          {/* Optimize Button */}
          {mongoId && analysis.atsScore && (
            <div className="jd-optimize-actions">
              <button
                className="jd-optimize-btn"
                onClick={handleOptimize}
                disabled={tailorLoading}
              >
                {tailorLoading ? 'Optimizing...' : 'Optimize Resume for This JD'}
              </button>
              <button
                className="jd-jobscan-btn"
                onClick={handleRunJobscan}
                disabled={jobscanLoading}
              >
                {jobscanLoading ? 'Scanning...' : 'Run Jobscan ATS Scan'}
              </button>
              {/* Jobscan status indicator */}
              <span
                className={`jscan-status-dot ${jobscanStatus?.active ? 'active' : ''}`}
                title={jobscanStatus?.active ? 'Jobscan session active' : 'Jobscan not connected'}
              />
            </div>
          )}

          {/* Tailor Preview */}
          {(workflowStep === 'tailor-preview' || workflowStep === 'tailoring') && tailorResult && (
            <TailorPreview result={tailorResult} onApply={handleApplyTailorChanges} />
          )}

          {tailorLoading && (
            <div className="jd-loading-card">
              <div className="jd-spinner" />
              <span>Generating optimized resume...</span>
            </div>
          )}

          {/* Jobscan Results */}
          {jobscanReport && (
            <div className="jscan-results-section">
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
                    <button className="jd-optimize-btn" onClick={handleReoptimize} disabled={tailorLoading}>
                      {tailorLoading ? 'Optimizing...' : 'Auto-Fix Remaining Gaps'}
                    </button>
                    <button className="jd-jobscan-btn" onClick={handleRunJobscan} disabled={jobscanLoading}>
                      {jobscanLoading ? 'Scanning...' : 'Re-Scan'}
                    </button>
                  </div>
                </div>
              )}

              {jobscanReport.matchRate >= 90 && (
                <div className="jscan-success">
                  ATS score is {jobscanReport.matchRate}% - ready to apply!
                </div>
              )}
            </div>
          )}

          {jobscanLoading && (
            <div className="jd-loading-card">
              <div className="jd-spinner" />
              <span>Running Jobscan ATS scan (this takes ~30s)...</span>
            </div>
          )}

          {jobscanError && <div className="jd-error">{jobscanError}</div>}

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

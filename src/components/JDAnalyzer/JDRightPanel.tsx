import { useJDStore } from '../../hooks/useJDStore';
import { useResumeStore } from '../../hooks/useResumeStore';
import { applyTailorChanges } from '../../utils/applyTailorChanges';
import { scanAndIterate } from '../../api/jobscanApi';
import { TailorPreview } from './TailorPreview';
import { SuggestionsPanel } from '../Suggestions/SuggestionsPanel';

function buildAcceptedMap(result: { bulletChanges?: { bulletId: string }[]; bulletReorders?: { entryId: string }[]; bulletSwaps?: { removeBulletId: string }[]; projectSwaps?: { remove?: string[]; add?: unknown[] } }): Record<string, boolean> {
  const accepted: Record<string, boolean> = { summary: true, skills: true };
  for (const bc of (result.bulletChanges || [])) accepted[bc.bulletId] = true;
  for (const br of (result.bulletReorders || [])) accepted[`reorder-${br.entryId}`] = true;
  for (const bs of (result.bulletSwaps || [])) accepted[`swap-${bs.removeBulletId}`] = true;
  if (result.projectSwaps?.remove) {
    for (const projId of result.projectSwaps.remove) accepted[`remove-proj-${projId}`] = true;
  }
  if (result.projectSwaps?.add) {
    for (let i = 0; i < result.projectSwaps.add.length; i++) accepted[`add-proj-${i}`] = true;
  }
  return accepted;
}

export function JDRightPanel() {
  const tailorResult = useJDStore((s) => s.tailorResult);
  const tailorAccepted = useJDStore((s) => s.tailorAccepted);
  const tailorLoading = useJDStore((s) => s.tailorLoading);
  const workflowStep = useJDStore((s) => s.workflowStep);
  const iterationCount = useJDStore((s) => s.iterationCount);
  const analysis = useJDStore((s) => s.analysis);
  const jdText = useJDStore((s) => s.jdText);
  const scoreHistory = useJDStore((s) => s.scoreHistory);
  const previousChangesApplied = useJDStore((s) => s.previousChangesApplied);
  const recordAppliedChanges = useJDStore((s) => s.recordAppliedChanges);
  const recordScanResult = useJDStore((s) => s.recordScanResult);
  const jobscanReport = useJDStore((s) => s.jobscanReport);
  const jobscanError = useJDStore((s) => s.jobscanError);

  const mongoId = useResumeStore((s) => s.mongoId);
  const resumeData = useResumeStore((s) => s.data);
  const flushSave = useResumeStore((s) => s.flushSave);
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

  const doApplyChanges = (): string[] => {
    if (!tailorResult) return [];
    const storeMethods = {
      updateSummary, updateSkillRow, addSkillRow, updateBullet,
      reorderBullets, removeBullet, insertBulletAfter, addBullet,
      addProject, updateProject, removeProject,
    };
    return applyTailorChanges(
      tailorResult,
      tailorAccepted,
      resumeData,
      storeMethods,
      () => useResumeStore.getState().data.skills,
    );
  };

  const doScanAndIterate = async (applied: string[]) => {
    if (!mongoId || !analysis) return;

    try {
      const iterCtx = iterationCount > 0 ? {
        round: iterationCount,
        scoreHistory,
        previousChangesApplied: [...previousChangesApplied, ...applied],
        remainingGaps: { hardSkills: [] as string[], softSkills: [] as string[] },
      } : undefined;

      const { jobscanReport: report, tailorResult: nextTailor } = await scanAndIterate(
        mongoId,
        analysis,
        jdText,
        iterCtx,
      );

      // Record the Jobscan score
      recordScanResult(report.matchRate);
      useJDStore.setState({
        jobscanReport: report,
        jobscanStatus: { active: true, onMatchReport: true },
      });

      // If backend returned next edits (score < 90%), show them for approval
      if (nextTailor) {
        const accepted = buildAcceptedMap(nextTailor);
        useJDStore.setState({
          tailorResult: nextTailor,
          tailorAccepted: accepted,
          workflowStep: 'tailor-preview',
          iterationCount: iterationCount + 1,
        });
      } else {
        // Score >= 90% or no edits needed
        useJDStore.setState({ workflowStep: 'results' });
      }
    } catch (err) {
      useJDStore.setState({
        jobscanError: (err as Error).message,
        workflowStep: 'results',
      });
    }
  };

  const handleApplyAndScan = async () => {
    if (!mongoId || !tailorResult || !analysis) return;
    useJDStore.setState({ workflowStep: 'applying' });

    // 1. Apply accepted changes locally
    const applied = doApplyChanges();
    recordAppliedChanges(applied);

    // 2. Save to MongoDB
    await flushSave();

    // 3. Clear tailor preview, move to scanning
    useJDStore.setState({ tailorResult: null, tailorAccepted: {}, workflowStep: 'scanning' });

    // 4. Scan with Jobscan + iterate
    await doScanAndIterate(applied);
  };

  const handleScanOnly = async () => {
    if (!mongoId || !analysis) return;
    useJDStore.setState({ tailorResult: null, tailorAccepted: {}, workflowStep: 'scanning' });
    await doScanAndIterate([]);
  };

  // --- TailorPreview: edits to approve ---
  const showTailor = tailorResult && (workflowStep === 'tailor-preview' || workflowStep === 'tailoring');
  if (showTailor) {
    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        <TailorPreview
          result={tailorResult}
          onApplyAndScan={handleApplyAndScan}
          onScanOnly={handleScanOnly}
          iterationCount={iterationCount}
        />
      </div>
    );
  }

  // --- Loading / scanning spinner ---
  if (tailorLoading || workflowStep === 'applying' || workflowStep === 'scanning') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="jd-loading-card">
          <div className="jd-spinner" />
          <span>
            {workflowStep === 'applying'
              ? 'Applying changes...'
              : workflowStep === 'scanning'
                ? 'Scanning with Jobscan...'
                : `Generating edits${iterationCount > 1 ? ` (Round ${iterationCount})` : ''}...`}
          </span>
        </div>
      </div>
    );
  }

  // --- Results view: show Jobscan score after scan completes ---
  if (workflowStep === 'results' && jobscanReport) {
    const score = jobscanReport.matchRate;
    const isGood = score >= 90;
    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
        <div className="tp-container">
          <div className="tp-header">
            <h4>Jobscan Results</h4>
          </div>

          {/* Score */}
          <div style={{
            textAlign: 'center',
            padding: '24px 16px',
            background: isGood ? '#f0fdf4' : '#fef9c3',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '48px', fontWeight: 700, color: isGood ? '#16a34a' : '#ca8a04' }}>
              {score}%
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              {isGood ? 'ATS match target reached!' : 'Below 90% target'}
            </div>
          </div>

          {/* Score History */}
          {scoreHistory.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ margin: '0 0 8px' }}>Score History</h5>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {scoreHistory.map((s, i) => (
                  <span key={i} style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    background: s.score >= 90 ? '#dcfce7' : '#fef3c7',
                    color: s.score >= 90 ? '#166534' : '#92400e',
                  }}>
                    R{s.round}: {s.score}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skill Gaps */}
          {jobscanReport.hardSkills?.missing?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h5 style={{ margin: '0 0 6px' }}>Missing Hard Skills</h5>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {jobscanReport.hardSkills.missing.map((s: string) => (
                  <span key={s} className="jd-keyword-chip missing">{s}</span>
                ))}
              </div>
            </div>
          )}
          {jobscanReport.softSkills?.missing?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h5 style={{ margin: '0 0 6px' }}>Missing Soft Skills</h5>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {jobscanReport.softSkills.missing.map((s: string) => (
                  <span key={s} className="jd-keyword-chip missing">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {jobscanError && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>
              {jobscanError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback to suggestions
  return <SuggestionsPanel />;
}

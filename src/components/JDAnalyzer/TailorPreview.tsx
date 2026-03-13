import type { TailorResult } from '../../types/jd';
import { useJDStore } from '../../hooks/useJDStore';
import { useResumeStore } from '../../hooks/useResumeStore';

function DiffText({ original, revised }: { original: string; revised: string }) {
  // Simple side-by-side diff display
  if (original === revised) return <span className="tp-unchanged">{revised}</span>;
  return (
    <div className="tp-diff">
      <div className="tp-diff-old">{original}</div>
      <div className="tp-diff-arrow">&darr;</div>
      <div className="tp-diff-new">{revised}</div>
    </div>
  );
}

interface TailorPreviewProps {
  result: TailorResult;
  onApply: () => void;
  onApplyAndScan?: () => void;
  iterationCount?: number;
}

export function TailorPreview({ result, onApply, onApplyAndScan, iterationCount }: TailorPreviewProps) {
  const accepted = useJDStore((s) => s.tailorAccepted);
  const setAccepted = useJDStore((s) => s.setTailorAccepted);
  const acceptAll = useJDStore((s) => s.acceptAllTailor);
  const resumeData = useResumeStore((s) => s.data);

  const totalChanges =
    1 + // summary
    1 + // skills
    (result.bulletChanges?.length || 0) +
    (result.bulletReorders?.length || 0) +
    (result.bulletSwaps?.length || 0) +
    (result.projectSwaps?.remove?.length || 0) +
    (result.projectSwaps?.add?.length || 0);

  const acceptedCount = Object.values(accepted).filter(Boolean).length;

  return (
    <div className="tp-container">
      <div className="tp-header">
        <div className="tp-header-title">
          <h4>Proposed Changes</h4>
          {iterationCount && iterationCount > 0 && (
            <span className="tp-round-badge">Round {iterationCount}</span>
          )}
        </div>
        <div className="tp-header-actions">
          <span className="tp-count">{acceptedCount}/{totalChanges} accepted</span>
          <button className="jd-small-btn" onClick={acceptAll}>Accept All</button>
          <button className="jd-small-btn" onClick={onApply} disabled={acceptedCount === 0}>
            Apply Only
          </button>
          {onApplyAndScan && (
            <button className="jd-small-btn primary" onClick={onApplyAndScan} disabled={acceptedCount === 0}>
              Apply &amp; Scan
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {result.summary && (
        <div className="tp-change-card">
          <label className="tp-change-header">
            <input
              type="checkbox"
              checked={!!accepted['summary']}
              onChange={(e) => setAccepted('summary', e.target.checked)}
            />
            <span className="tp-change-type">Summary</span>
          </label>
          <DiffText
            original={resumeData.summary || '(none)'}
            revised={result.summary}
          />
        </div>
      )}

      {/* Skills */}
      {result.skills && result.skills.length > 0 && (
        <div className="tp-change-card">
          <label className="tp-change-header">
            <input
              type="checkbox"
              checked={!!accepted['skills']}
              onChange={(e) => setAccepted('skills', e.target.checked)}
            />
            <span className="tp-change-type">Skills</span>
          </label>
          <div className="tp-skills-preview">
            {result.skills.map((s) => {
              const existing = resumeData.skills.find((rs) => rs.id === s.id);
              const isNew = !existing;
              const changed = existing && (existing.category !== s.category || existing.skills !== s.skills);
              return (
                <div
                  key={s.id}
                  className={`tp-skill-row ${isNew ? 'new' : changed ? 'changed' : ''}`}
                >
                  <strong>{s.category}:</strong> {s.skills}
                  {isNew && <span className="tp-badge new">NEW</span>}
                  {changed && <span className="tp-badge changed">UPDATED</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bullet Changes */}
      {result.bulletChanges && result.bulletChanges.length > 0 && (
        <div className="tp-change-group">
          <h5>Bullet Rephrasing</h5>
          {result.bulletChanges.map((bc) => {
            const entry = bc.section === 'experience'
              ? resumeData.experience.find((e) => e.id === bc.entryId)
              : resumeData.projects.find((p) => p.id === bc.entryId);
            const entryName = entry
              ? (bc.section === 'experience' ? (entry as { company: string }).company : (entry as { title: string }).title)
              : bc.entryId;

            return (
              <div key={bc.bulletId} className="tp-change-card">
                <label className="tp-change-header">
                  <input
                    type="checkbox"
                    checked={!!accepted[bc.bulletId]}
                    onChange={(e) => setAccepted(bc.bulletId, e.target.checked)}
                  />
                  <span className="tp-change-type">{entryName}</span>
                </label>
                <DiffText original={bc.original} revised={bc.revised} />
              </div>
            );
          })}
        </div>
      )}

      {/* Bullet Swaps (from vault) */}
      {result.bulletSwaps && result.bulletSwaps.length > 0 && (
        <div className="tp-change-group">
          <h5>Vault Bullet Swaps</h5>
          {result.bulletSwaps.map((bs) => {
            const entry = bs.section === 'experience'
              ? resumeData.experience.find((e) => e.id === bs.entryId)
              : resumeData.projects.find((p) => p.id === bs.entryId);
            const entryName = entry
              ? (bs.section === 'experience' ? (entry as { company: string }).company : (entry as { title: string }).title)
              : bs.entryId;
            const oldBullet = entry?.bullets.find((b) => b.id === bs.removeBulletId);

            return (
              <div key={`swap-${bs.removeBulletId}`} className="tp-change-card">
                <label className="tp-change-header">
                  <input
                    type="checkbox"
                    checked={!!accepted[`swap-${bs.removeBulletId}`]}
                    onChange={(e) => setAccepted(`swap-${bs.removeBulletId}`, e.target.checked)}
                  />
                  <span className="tp-change-type">{entryName}</span>
                  <span className="tp-badge vault">VAULT SWAP</span>
                </label>
                <DiffText
                  original={oldBullet?.text || '(unknown bullet)'}
                  revised={bs.addBulletText}
                />
                <div className="tp-vault-source">From: {bs.vaultSource}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Swaps */}
      {result.projectSwaps && (
        <>
          {result.projectSwaps.remove && result.projectSwaps.remove.length > 0 && (
            <div className="tp-change-group">
              <h5>Remove Projects</h5>
              {result.projectSwaps.remove.map((projId) => {
                const proj = resumeData.projects.find((p) => p.id === projId);
                return (
                  <div key={`remove-proj-${projId}`} className="tp-change-card">
                    <label className="tp-change-header">
                      <input
                        type="checkbox"
                        checked={!!accepted[`remove-proj-${projId}`]}
                        onChange={(e) => setAccepted(`remove-proj-${projId}`, e.target.checked)}
                      />
                      <span className="tp-change-type">{proj?.title || projId}</span>
                      <span className="tp-badge remove">REMOVE</span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}

          {result.projectSwaps.add && result.projectSwaps.add.length > 0 && (
            <div className="tp-change-group">
              <h5>Add Projects (from Vault)</h5>
              {result.projectSwaps.add.map((proj, i) => (
                <div key={`add-proj-${i}`} className="tp-change-card">
                  <label className="tp-change-header">
                    <input
                      type="checkbox"
                      checked={!!accepted[`add-proj-${i}`]}
                      onChange={(e) => setAccepted(`add-proj-${i}`, e.target.checked)}
                    />
                    <span className="tp-change-type">{proj.title}</span>
                    <span className="tp-badge vault">FROM VAULT</span>
                  </label>
                  <div className="tp-project-preview">
                    {proj.techStack && <div className="tp-project-tech">{proj.techStack}</div>}
                    {proj.bullets.map((b, j) => (
                      <div key={j} className="tp-project-bullet">{b}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bullet Reorders */}
      {result.bulletReorders && result.bulletReorders.length > 0 && (
        <div className="tp-change-group">
          <h5>Bullet Reordering</h5>
          {result.bulletReorders.map((br) => {
            const entry = br.section === 'experience'
              ? resumeData.experience.find((e) => e.id === br.entryId)
              : resumeData.projects.find((p) => p.id === br.entryId);
            const entryName = entry
              ? (br.section === 'experience' ? (entry as { company: string }).company : (entry as { title: string }).title)
              : br.entryId;

            return (
              <div key={br.entryId} className="tp-change-card">
                <label className="tp-change-header">
                  <input
                    type="checkbox"
                    checked={!!accepted[`reorder-${br.entryId}`]}
                    onChange={(e) => setAccepted(`reorder-${br.entryId}`, e.target.checked)}
                  />
                  <span className="tp-change-type">Reorder: {entryName}</span>
                </label>
                <div className="tp-reorder-list">
                  {br.bulletIds.map((bid, i) => {
                    const bullet = entry?.bullets.find((b) => b.id === bid);
                    return (
                      <div key={bid} className="tp-reorder-item">
                        <span className="tp-reorder-num">{i + 1}.</span>
                        <span>{bullet?.text.slice(0, 80) || bid}{bullet && bullet.text.length > 80 ? '...' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

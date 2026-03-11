import type { JobscanReport } from '../../types/jd';

function SkillChips({ label, skills, variant }: { label: string; skills: string[]; variant: 'found' | 'missing' }) {
  if (skills.length === 0) return null;
  return (
    <div className="jscan-skill-group">
      <div className="jscan-skill-label">{label} ({skills.length})</div>
      <div className="jscan-skill-chips">
        {skills.map((s) => (
          <span key={s} className={`jscan-chip ${variant}`}>{s}</span>
        ))}
      </div>
    </div>
  );
}

export function JobscanScoreCard({ report }: { report: JobscanReport }) {
  const color = report.matchRate >= 80 ? '#22c55e' : report.matchRate >= 60 ? '#eab308' : '#ef4444';
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (report.matchRate / 100) * circumference;

  return (
    <div className="jscan-card">
      <div className="jscan-header">
        <h4>Jobscan ATS Score</h4>
        <span className="jscan-scan-id">Scan #{report.scanId}</span>
      </div>

      <div className="jscan-body">
        <div className="jscan-score-ring">
          <svg width="108" height="108" viewBox="0 0 108 108">
            <circle cx="54" cy="54" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="7" />
            <circle
              cx="54" cy="54" r={radius} fill="none" stroke={color} strokeWidth="7"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 54 54)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="jscan-score-value" style={{ color }}>{report.matchRate}%</div>
        </div>

        <div className="jscan-skills-section">
          <div className="jscan-skills-block">
            <h5>Hard Skills</h5>
            <SkillChips label="Found" skills={report.hardSkills.found} variant="found" />
            <SkillChips label="Missing" skills={report.hardSkills.missing} variant="missing" />
          </div>
          <div className="jscan-skills-block">
            <h5>Soft Skills</h5>
            <SkillChips label="Found" skills={report.softSkills.found} variant="found" />
            <SkillChips label="Missing" skills={report.softSkills.missing} variant="missing" />
          </div>
        </div>
      </div>

      {report.otherFindings.length > 0 && (
        <div className="jscan-findings">
          {report.otherFindings.map((f, i) => (
            <div key={i} className="jscan-finding">
              <span className="jscan-finding-cat">{f.category.replace(/_/g, ' ')}</span>
              <span className="jscan-finding-status">{f.status} {f.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

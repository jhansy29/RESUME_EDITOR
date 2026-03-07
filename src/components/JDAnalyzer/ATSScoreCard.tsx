import type { ATSScore } from '../../types/jd';

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="ats-score-circle">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="44" cy="44" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="ats-score-value" style={{ color }}>{score}%</div>
      <div className="ats-score-label">{label}</div>
    </div>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="ats-bar">
      <div className="ats-bar-header">
        <span>{label}</span>
        <span style={{ color }}>{score}%</span>
      </div>
      <div className="ats-bar-track">
        <div className="ats-bar-fill" style={{ width: `${score}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export function ATSScoreCard({ score }: { score: ATSScore }) {
  return (
    <div className="ats-card">
      <h4>ATS Match Score</h4>
      <div className="ats-card-body">
        <ScoreCircle score={score.overall} label="Overall" />
        <div className="ats-bars">
          <ScoreBar score={score.breakdown.keywordMatch} label="Keywords" />
          <ScoreBar score={score.breakdown.skillsMatch} label="Skills" />
          <ScoreBar score={score.breakdown.experienceMatch} label="Experience" />
          <ScoreBar score={score.breakdown.educationMatch} label="Education" />
        </div>
      </div>

      {score.strongMatches.length > 0 && (
        <div className="ats-section">
          <h5>Strengths</h5>
          {score.strongMatches.map((s, i) => (
            <div key={i} className="ats-match-item ats-strong">{s}</div>
          ))}
        </div>
      )}

      {score.gaps.length > 0 && (
        <div className="ats-section">
          <h5>Gaps</h5>
          {score.gaps.map((g, i) => (
            <div key={i} className="ats-match-item ats-gap">{g}</div>
          ))}
        </div>
      )}
    </div>
  );
}

import type { JDKeyword, ATSScore } from '../../types/jd';

function KeywordChip({ kw, matched }: { kw: JDKeyword; matched: boolean }) {
  return (
    <span className={`jd-keyword-chip ${matched ? 'matched' : 'missing'}`}>
      {matched ? '\u2713' : '\u2717'} {kw.keyword}
      {kw.frequency > 1 && <span className="jd-keyword-freq">{kw.frequency}x</span>}
    </span>
  );
}

interface Props {
  mustHave: JDKeyword[];
  niceToHave: JDKeyword[];
  atsScore?: ATSScore | null;
}

export function JDKeywordDisplay({ mustHave, niceToHave, atsScore }: Props) {
  const matchedSet = new Set((atsScore?.matchedKeywords ?? []).map((k) => k.toLowerCase()));

  return (
    <div className="jd-keywords">
      <div className="jd-keyword-section">
        <h5>Must-Have Keywords ({mustHave.length})</h5>
        <div className="jd-keyword-list">
          {mustHave.map((kw) => (
            <KeywordChip key={kw.keyword} kw={kw} matched={matchedSet.has(kw.keyword.toLowerCase())} />
          ))}
        </div>
      </div>

      <div className="jd-keyword-section">
        <h5>Nice-to-Have Keywords ({niceToHave.length})</h5>
        <div className="jd-keyword-list">
          {niceToHave.map((kw) => (
            <KeywordChip key={kw.keyword} kw={kw} matched={matchedSet.has(kw.keyword.toLowerCase())} />
          ))}
        </div>
      </div>
    </div>
  );
}

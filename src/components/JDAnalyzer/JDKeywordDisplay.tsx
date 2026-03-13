import type { JDKeyword } from '../../types/jd';

function KeywordChip({ kw }: { kw: JDKeyword }) {
  const isExample = kw.context === 'example_in_parenthetical';
  return (
    <span
      className={`jd-keyword-chip${isExample ? ' example' : ''}`}
      title={isExample ? 'Parenthetical example — any equivalent tool counts' : undefined}
    >
      {kw.keyword}
      {kw.frequency > 1 && <span className="jd-keyword-freq">{kw.frequency}x</span>}
      {isExample && <span className="jd-keyword-example-tag">eg</span>}
    </span>
  );
}

interface Props {
  mustHave: JDKeyword[];
  niceToHave: JDKeyword[];
}

export function JDKeywordDisplay({ mustHave, niceToHave }: Props) {
  return (
    <div className="jd-keywords">
      <div className="jd-keyword-section">
        <h5>Must-Have Keywords ({mustHave.length})</h5>
        <div className="jd-keyword-list">
          {mustHave.map((kw) => (
            <KeywordChip key={kw.keyword} kw={kw} />
          ))}
        </div>
      </div>

      <div className="jd-keyword-section">
        <h5>Nice-to-Have Keywords ({niceToHave.length})</h5>
        <div className="jd-keyword-list">
          {niceToHave.map((kw) => (
            <KeywordChip key={kw.keyword} kw={kw} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Simple word-level diff display
export function SuggestionDiff({ current, suggested }: { current: string; suggested: string }) {
  const currentWords = current.split(/\s+/);
  const suggestedWords = suggested.split(/\s+/);

  // Simple approach: show current with strikethrough, then suggested with highlight
  return (
    <div className="sug-diff">
      <div className="sug-diff-old">
        <span className="sug-diff-label">Current:</span>
        <span className="sug-diff-text">{current}</span>
      </div>
      <div className="sug-diff-new">
        <span className="sug-diff-label">Suggested:</span>
        <span className="sug-diff-text">{suggested}</span>
      </div>
    </div>
  );
}

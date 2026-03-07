import { useState } from 'react';
import type { Suggestion } from '../../types/suggestions';
import { SuggestionDiff } from './SuggestionDiff';

const TYPE_LABELS: Record<string, string> = {
  summary_rewrite: 'Summary',
  skill_add: 'Add Skill',
  skill_remove: 'Remove Skill',
  skill_reorder: 'Reorder Skills',
  bullet_rephrase: 'Rephrase',
  bullet_reorder: 'Reorder',
  bullet_swap: 'Swap Bullet',
  project_swap: 'Swap Project',
  project_add: 'Add Project',
  project_remove: 'Remove Project',
};

const TYPE_COLORS: Record<string, string> = {
  summary_rewrite: '#8b5cf6',
  skill_add: '#22c55e',
  skill_remove: '#ef4444',
  bullet_rephrase: '#3b82f6',
  bullet_swap: '#f59e0b',
  project_swap: '#ec4899',
  project_add: '#22c55e',
  project_remove: '#ef4444',
  bullet_reorder: '#6366f1',
};

interface Props {
  suggestion: Suggestion;
  onAccept: () => void;
  onReject: () => void;
}

export function SuggestionCard({ suggestion, onAccept, onReject }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isResolved = suggestion.status !== 'pending';

  const hasDiff = suggestion.type === 'summary_rewrite' ||
    suggestion.type === 'bullet_rephrase' ||
    suggestion.type === 'bullet_swap';

  return (
    <div className={`sug-card ${isResolved ? `sug-${suggestion.status}` : ''}`}>
      <div className="sug-card-header">
        <span
          className="sug-type-badge"
          style={{ background: `${TYPE_COLORS[suggestion.type] || '#6b7280'}20`, color: TYPE_COLORS[suggestion.type] || '#6b7280' }}
        >
          {TYPE_LABELS[suggestion.type] || suggestion.type}
        </span>
        <span className="sug-priority">P{suggestion.priority}</span>
        {!isResolved && (
          <div className="sug-actions">
            <button className="sug-accept" onClick={onAccept} title="Accept">{'\u2713'}</button>
            <button className="sug-reject" onClick={onReject} title="Reject">{'\u2717'}</button>
          </div>
        )}
        {isResolved && (
          <span className={`sug-status-badge sug-status-${suggestion.status}`}>
            {suggestion.status}
          </span>
        )}
      </div>

      <div className="sug-description">{suggestion.description}</div>

      {hasDiff && 'current' in suggestion && 'suggested' in suggestion && (
        <SuggestionDiff current={suggestion.current as string} suggested={suggestion.suggested as string} />
      )}

      {suggestion.type === 'skill_add' && (
        <div className="sug-skill-detail">
          Add <strong>{suggestion.keyword}</strong> to <em>{suggestion.category}</em>
        </div>
      )}

      {suggestion.type === 'project_swap' && (
        <div className="sug-project-detail">
          Replace <strong>{suggestion.removeTitle}</strong> with <strong>{suggestion.addTitle}</strong>
          {suggestion.addTechStack && <span className="sug-tech"> ({suggestion.addTechStack})</span>}
        </div>
      )}

      {suggestion.reasoning && (
        <button className="sug-reasoning-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide reasoning' : 'Why?'}
        </button>
      )}
      {expanded && <div className="sug-reasoning">{suggestion.reasoning}</div>}
    </div>
  );
}

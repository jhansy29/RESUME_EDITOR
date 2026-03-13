import { useState } from 'react';
import { useTrackerStore } from '../../hooks/useTrackerStore';
import { ApplicationForm } from './ApplicationForm';
import type { Application, ApplicationStatus } from '../../types/application';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  Bookmarked: '#6b7280',
  Applied: '#3b82f6',
  'Phone Screen': '#8b5cf6',
  Technical: '#6366f1',
  'On-site': '#ec4899',
  Offer: '#10b981',
  Accepted: '#059669',
  Rejected: '#ef4444',
  Ghosted: '#9ca3af',
  Withdrawn: '#f59e0b',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#9ca3af',
  Medium: '#f59e0b',
  High: '#ef4444',
};

interface Props {
  app: Application;
  resumeNames: Map<string, string>;
}

export function ApplicationRow({ app, resumeNames }: Props) {
  const { remove, setEditingId, editingId, update } = useTrackerStore();
  const [expanded, setExpanded] = useState(false);
  const isEditing = editingId === app._id;

  const handleToggleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    update(app._id, { starred: !app.starred } as any);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    update(app._id, { status: e.target.value as ApplicationStatus });
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const resumeName = app.resumeId ? resumeNames.get(app.resumeId) : null;

  return (
    <>
      <tr className={`tracker-row${app.starred ? ' starred' : ''}${expanded ? ' expanded' : ''}`}>
        <td className="tracker-td tracker-expand-cell">
          <button
            className={`tracker-chevron-btn${expanded ? ' open' : ''}`}
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            &#9654;
          </button>
        </td>
        <td className="tracker-td tracker-star-cell">
          <button
            className={`star-btn${app.starred ? ' active' : ''}`}
            title={app.starred ? 'Unstar' : 'Star'}
            onClick={handleToggleStar}
          >
            {app.starred ? '\u2605' : '\u2606'}
          </button>
        </td>
        <td className="tracker-td">
          <div className="tracker-company">
            <span className="tracker-company-name">{app.company}</span>
            {app.url && (
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="tracker-link"
                title="Open job posting"
                onClick={(e) => e.stopPropagation()}
              >
                ↗
              </a>
            )}
          </div>
        </td>
        <td className="tracker-td">{app.jobTitle}</td>
        <td className="tracker-td">
          <select
            className="tracker-status-badge"
            style={{ backgroundColor: STATUS_COLORS[app.status] + '18', color: STATUS_COLORS[app.status], borderColor: STATUS_COLORS[app.status] + '40' }}
            value={app.status}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
          >
            {Object.keys(STATUS_COLORS).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </td>
        <td className="tracker-td tracker-date">{formatDate(app.dateApplied)}</td>
        <td className="tracker-td">
          <span className="tracker-priority" style={{ color: PRIORITY_COLORS[app.priority] }}>
            {app.priority}
          </span>
        </td>
        <td className="tracker-td">
          <div className="tracker-actions">
            <button
              className="tracker-action-btn edit"
              onClick={(e) => { e.stopPropagation(); setEditingId(app._id); }}
              title="Edit"
            >
              Edit
            </button>
            <button
              className="tracker-action-btn delete"
              onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${app.company} - ${app.jobTitle}?`)) remove(app._id); }}
              title="Delete"
            >
              Del
            </button>
          </div>
        </td>
      </tr>
      {expanded && !isEditing && (
        <tr className="tracker-detail-row">
          <td colSpan={8} className="tracker-detail-cell">
            <div className="tracker-detail-grid">
              <div className="tracker-detail-item">
                <span className="tracker-detail-label">Location</span>
                <span className="tracker-detail-value">{app.location || '-'}</span>
              </div>
              <div className="tracker-detail-item">
                <span className="tracker-detail-label">Salary</span>
                <span className="tracker-detail-value">{app.salaryRange || '-'}</span>
              </div>
              <div className="tracker-detail-item">
                <span className="tracker-detail-label">Resume</span>
                <span className="tracker-detail-value">
                  {resumeName ? (
                    <a
                      href={`#view=editor&resume=${app.resumeId}`}
                      className="tracker-resume-link"
                    >
                      {resumeName}
                    </a>
                  ) : (
                    '-'
                  )}
                </span>
              </div>
              <div className="tracker-detail-item">
                <span className="tracker-detail-label">Applied</span>
                <span className="tracker-detail-value">{formatDate(app.dateApplied)}</span>
              </div>
              <div className="tracker-detail-item">
                <span className="tracker-detail-label">Last Updated</span>
                <span className="tracker-detail-value">{formatDate(app.dateUpdated)}</span>
              </div>
              <div className="tracker-detail-item">
                <span className="tracker-detail-label">Contact</span>
                <span className="tracker-detail-value">
                  {app.contactName || app.contactEmail
                    ? `${app.contactName || ''}${app.contactName && app.contactEmail ? ' · ' : ''}${app.contactEmail || ''}`
                    : '-'}
                </span>
              </div>
              {app.url && (
                <div className="tracker-detail-item full-width">
                  <span className="tracker-detail-label">URL</span>
                  <a href={app.url} target="_blank" rel="noopener noreferrer" className="tracker-detail-url">
                    {app.url}
                  </a>
                </div>
              )}
              {app.notes && (
                <div className="tracker-detail-item full-width">
                  <span className="tracker-detail-label">Notes</span>
                  <span className="tracker-detail-value">{app.notes}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
      {isEditing && (
        <tr className="tracker-edit-row">
          <td colSpan={8} style={{ padding: 0, border: 'none' }}>
            <ApplicationForm onClose={() => setEditingId(null)} />
          </td>
        </tr>
      )}
    </>
  );
}

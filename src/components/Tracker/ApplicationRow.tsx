import { useTrackerStore } from '../../hooks/useTrackerStore';
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
}

export function ApplicationRow({ app }: Props) {
  const { remove, setEditingId, update } = useTrackerStore();

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    update(app._id, { status: newStatus });
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <tr className="tracker-row">
      <td className="tracker-td">
        <div className="tracker-company">
          <span className="tracker-company-name">{app.company}</span>
          {app.url && (
            <a href={app.url} target="_blank" rel="noopener noreferrer" className="tracker-link" title="Open job posting">
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
          onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
        >
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
      <td className="tracker-td tracker-date">{formatDate(app.dateApplied)}</td>
      <td className="tracker-td">{app.location || '-'}</td>
      <td className="tracker-td">{app.salaryRange || '-'}</td>
      <td className="tracker-td">
        <span className="tracker-priority" style={{ color: PRIORITY_COLORS[app.priority] }}>
          {app.priority}
        </span>
      </td>
      <td className="tracker-td">
        <div className="tracker-actions">
          <button className="tracker-action-btn edit" onClick={() => setEditingId(app._id)} title="Edit">
            Edit
          </button>
          <button
            className="tracker-action-btn delete"
            onClick={() => { if (confirm(`Delete ${app.company} - ${app.jobTitle}?`)) remove(app._id); }}
            title="Delete"
          >
            Del
          </button>
        </div>
      </td>
    </tr>
  );
}

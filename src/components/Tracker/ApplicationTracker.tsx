import { useEffect, useState, useMemo } from 'react';
import { useTrackerStore } from '../../hooks/useTrackerStore';
import { ApplicationForm } from './ApplicationForm';
import { ApplicationRow } from './ApplicationRow';
import { TrackerStats } from './TrackerStats';
import { listResumes, type ResumeMeta } from '../../api/resumeApi';
import type { ApplicationStatus } from '../../types/application';
import '../../styles/tracker.css';

const ALL_STATUSES: ApplicationStatus[] = [
  'Bookmarked', 'Applied', 'Phone Screen', 'Technical',
  'On-site', 'Offer', 'Accepted', 'Rejected', 'Ghosted', 'Withdrawn',
];

export function ApplicationTracker() {
  const {
    applications, loading, filterStatus, searchQuery, sortField, sortDir,
    fetch, setFilterStatus, setSearchQuery, setSortField, editingId, setEditingId,
  } = useTrackerStore();

  const [showForm, setShowForm] = useState(false);
  const [resumes, setResumes] = useState<ResumeMeta[]>([]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { listResumes().then(setResumes).catch(() => {}); }, []);

  const resumeNames = useMemo(() => {
    const map = new Map<string, string>();
    resumes.forEach((r) => map.set(r._id, r.name));
    return map;
  }, [resumes]);

  // Filter and sort
  const filtered = applications
    .filter((a) => filterStatus === 'All' || a.status === filterStatus)
    .filter((a) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.company.toLowerCase().includes(q) ||
        a.jobTitle.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Starred items always come first
      const starDiff = (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
      if (starDiff !== 0) return starDiff;
      let cmp = 0;
      if (sortField === 'dateApplied' || sortField === 'dateUpdated') {
        cmp = new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime();
      } else {
        cmp = a[sortField].localeCompare(b[sortField]);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const sortIcon = (field: typeof sortField) =>
    sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  if (loading) {
    return <div className="tracker-loading">Loading applications...</div>;
  }

  return (
    <div className="tracker-container">
      <div className="tracker-header">
        <div>
          <h2 className="tracker-title">Application Tracker</h2>
          <p className="tracker-subtitle">{applications.length} applications tracked</p>
        </div>
        <button className="tracker-add-btn" onClick={() => { setShowForm(!showForm); setEditingId(null); }}>
          {showForm ? 'Cancel' : '+ New Application'}
        </button>
      </div>

      <TrackerStats applications={applications} />

      {showForm && !editingId && (
        <ApplicationForm
          onClose={() => { setShowForm(false); setEditingId(null); }}
        />
      )}

      <div className="tracker-controls">
        <input
          className="tracker-search"
          type="text"
          placeholder="Search company, title, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="tracker-filter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ApplicationStatus | 'All')}
        >
          <option value="All">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="tracker-table-wrap">
        <table className="tracker-table">
          <thead>
            <tr>
              <th className="tracker-th" style={{ width: 32 }}></th>
              <th className="tracker-th tracker-th-star" style={{ width: 36 }}>{'\u2605'}</th>
              <th className="tracker-th sortable" onClick={() => setSortField('company')}>
                Company{sortIcon('company')}
              </th>
              <th className="tracker-th">Title</th>
              <th className="tracker-th sortable" onClick={() => setSortField('status')}>
                Status{sortIcon('status')}
              </th>
              <th className="tracker-th sortable" onClick={() => setSortField('dateApplied')}>
                Applied{sortIcon('dateApplied')}
              </th>
              <th className="tracker-th">Priority</th>
              <th className="tracker-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="tracker-empty">
                  {applications.length === 0
                    ? 'No applications yet. Add your first one above!'
                    : 'No applications match your filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((app) => (
                <ApplicationRow key={app._id} app={app} resumeNames={resumeNames} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

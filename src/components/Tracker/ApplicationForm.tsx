import { useState, useEffect } from 'react';
import { useTrackerStore } from '../../hooks/useTrackerStore';
import { scrapeJobUrl } from '../../api/applicationsApi';
import type { ApplicationStatus, Priority } from '../../types/application';

const ALL_STATUSES: ApplicationStatus[] = [
  'Bookmarked', 'Applied', 'Phone Screen', 'Technical',
  'On-site', 'Offer', 'Accepted', 'Rejected', 'Ghosted', 'Withdrawn',
];

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];

interface Props {
  onClose: () => void;
}

export function ApplicationForm({ onClose }: Props) {
  const { add, update, editingId, applications } = useTrackerStore();
  const editing = editingId ? applications.find((a) => a._id === editingId) : null;

  const [showFull, setShowFull] = useState(!!editing);
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Bookmarked');
  const [url, setUrl] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [resumeVersion, setResumeVersion] = useState('');
  const [dateApplied, setDateApplied] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');

  useEffect(() => {
    if (editing) {
      setCompany(editing.company);
      setJobTitle(editing.jobTitle);
      setStatus(editing.status);
      setUrl(editing.url);
      setLocation(editing.location);
      setSalaryRange(editing.salaryRange);
      setResumeVersion(editing.resumeVersion);
      setDateApplied(editing.dateApplied?.slice(0, 10) || '');
      setNotes(editing.notes);
      setPriority(editing.priority);
      setContactName(editing.contactName);
      setContactEmail(editing.contactEmail);
      setShowFull(true);
    }
  }, [editing]);

  const handleUrlPaste = async (pastedUrl: string) => {
    setUrl(pastedUrl);
    if (!pastedUrl.match(/^https?:\/\/.+/)) return;

    setScraping(true);
    setScrapeError('');
    try {
      const data = await scrapeJobUrl(pastedUrl);
      if (data.company && !company) setCompany(data.company);
      if (data.jobTitle && !jobTitle) setJobTitle(data.jobTitle);
      if (data.location) setLocation(data.location);
      if (data.salaryRange) setSalaryRange(data.salaryRange);
      if (data.location || data.salaryRange) setShowFull(true);
    } catch {
      setScrapeError('Could not auto-fill from URL');
    } finally {
      setScraping(false);
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setScrapeError('');
  };

  const handleUrlFieldPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (pasted.match(/^https?:\/\/.+/)) {
      e.preventDefault();
      handleUrlPaste(pasted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !jobTitle.trim()) return;
    const data = {
      company, jobTitle, status, url, location, salaryRange,
      resumeVersion, dateApplied, notes, priority, contactName, contactEmail,
    };
    if (editing) {
      await update(editing._id, data);
    } else {
      await add(data);
    }
    onClose();
  };

  return (
    <form className="tracker-form" onSubmit={handleSubmit}>
      <div className="tracker-form-header">
        <h3 className="tracker-form-title">{editing ? 'Edit Application' : 'Add Application'}</h3>
        {scraping && <span className="tracker-scraping">Fetching job details...</span>}
        {scrapeError && <span className="tracker-scrape-error">{scrapeError}</span>}
      </div>

      <div className="tracker-quick-row">
        <input
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          onPaste={handleUrlFieldPaste}
          placeholder="Paste job URL to auto-fill"
          className="tracker-quick-input tracker-url-input"
        />
        <input
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company *"
          className="tracker-quick-input"
        />
        <input
          required
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Job Title *"
          className="tracker-quick-input"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          className="tracker-quick-select"
        >
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!showFull ? (
        <div className="tracker-form-actions" style={{ marginTop: 12 }}>
          <button type="button" className="tracker-expand-link" onClick={() => setShowFull(true)}>
            + Location, salary, contacts, notes...
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="tracker-cancel-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="tracker-save-btn" disabled={scraping}>
            {editing ? 'Update' : 'Add'}
          </button>
        </div>
      ) : (
        <>
          <div className="tracker-form-grid" style={{ marginTop: 16 }}>
            <div className="tracker-field">
              <label>Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco, CA" />
            </div>
            <div className="tracker-field">
              <label>Salary Range</label>
              <input value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} placeholder="$120k-$160k" />
            </div>
            <div className="tracker-field">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="tracker-field">
              <label>Date Applied</label>
              <input type="date" value={dateApplied} onChange={(e) => setDateApplied(e.target.value)} />
            </div>
            <div className="tracker-field">
              <label>Resume Version</label>
              <input value={resumeVersion} onChange={(e) => setResumeVersion(e.target.value)} placeholder="AI/ML v2" />
            </div>
            <div className="tracker-field">
              <label>Contact Name</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="tracker-field">
              <label>Contact Email</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="jane@company.com" />
            </div>
            <div className="tracker-field full-width">
              <label>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Referral from..., interview prep notes..." rows={2} />
            </div>
          </div>
          <div className="tracker-form-actions">
            <button type="button" className="tracker-cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="tracker-save-btn" disabled={scraping}>
              {editing ? 'Update' : 'Add Application'}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

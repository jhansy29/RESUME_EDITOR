import type { Application } from '../../types/application';

interface Props {
  applications: Application[];
}

const ACTIVE_STATUSES = ['Applied', 'Phone Screen', 'Technical', 'On-site'];

export function TrackerStats({ applications }: Props) {
  const total = applications.length;
  const active = applications.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const offers = applications.filter((a) => a.status === 'Offer' || a.status === 'Accepted').length;
  const rejected = applications.filter((a) => a.status === 'Rejected' || a.status === 'Ghosted').length;
  const responseRate = total > 0 ? Math.round(((total - applications.filter(a => a.status === 'Applied' || a.status === 'Bookmarked').length) / total) * 100) : 0;

  const stats = [
    { label: 'Total', value: total, color: '#6366f1' },
    { label: 'Active', value: active, color: '#3b82f6' },
    { label: 'Offers', value: offers, color: '#10b981' },
    { label: 'Rejected', value: rejected, color: '#ef4444' },
    { label: 'Response Rate', value: `${responseRate}%`, color: '#8b5cf6' },
  ];

  return (
    <div className="tracker-stats">
      {stats.map((s) => (
        <div key={s.label} className="tracker-stat-card">
          <span className="tracker-stat-value" style={{ color: s.color }}>{s.value}</span>
          <span className="tracker-stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

import { useResumeStore } from '../../hooks/useResumeStore';
import type { ContactInfo } from '../../types/resume';

export function HeaderForm() {
  const contact = useResumeStore((s) => s.data.contact);
  const update = useResumeStore((s) => s.updateContact);

  const fields: { key: keyof ContactInfo; label: string }[] = [
    { key: 'name', label: 'Full Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'github', label: 'GitHub' },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'googleScholar', label: 'Google Scholar' },
  ];

  return (
    <div className="form-section">
      <div className="form-section-title">Contact Info</div>
      {fields.map(({ key, label }) => (
        <div key={key} className="field-group">
          <label className="field-label">{label}</label>
          <input
            className="field-input"
            value={contact[key] || ''}
            onChange={(e) => update(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

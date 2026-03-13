import { useEffect, useState } from 'react';
import { useVaultStore, type VaultSection } from '../../hooks/useVaultStore';
import { getVault, createVault, importFromResume } from '../../api/vaultApi';
import { listResumes, type ResumeMeta } from '../../api/resumeApi';
import { VaultExperienceEditor } from './VaultExperienceEditor';
import { VaultProjectEditor } from './VaultProjectEditor';
import { VaultSkillsEditor } from './VaultSkillsEditor';
import { VaultSummaryEditor } from './VaultSummaryEditor';
import { VaultResumePickerModal } from './VaultResumePickerModal';
import type { Certification, Extracurricular } from '../../types/vault';
import '../../styles/vault.css';

function VaultSidebar() {
  const activeSection = useVaultStore((s) => s.activeSection);
  const setActive = useVaultStore((s) => s.setActiveSection);

  const sections: { key: VaultSection; label: string }[] = [
    { key: 'contact', label: 'Contact' },
    { key: 'education', label: 'Education' },
    { key: 'certifications', label: 'Certifications' },
    { key: 'summaries', label: 'Summaries' },
    { key: 'skills', label: 'Skills' },
    { key: 'experience', label: 'Experience' },
    { key: 'projects', label: 'Projects' },
    { key: 'extracurriculars', label: 'Extracurriculars' },
  ];

  return (
    <div className="vault-sidebar">
      {sections.map((s) => (
        <button
          key={s.key}
          className={`vault-sidebar-btn ${activeSection === s.key ? 'active' : ''}`}
          onClick={() => setActive(s.key)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function ContactEditor() {
  const contact = useVaultStore((s) => s.vault?.contact) ?? { name: '', phone: '', email: '', linkedin: '', github: '', portfolio: '' };
  const update = useVaultStore((s) => s.updateContact);

  const fields: { key: keyof typeof contact; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'github', label: 'GitHub' },
    { key: 'portfolio', label: 'Portfolio' },
  ];

  return (
    <div className="form-section">
      <div className="form-section-title">Contact Info</div>
      {fields.map((f) => (
        <div className="field-group" key={f.key} style={{ marginBottom: 8 }}>
          <label className="field-label">{f.label}</label>
          <input className="field-input" value={(contact[f.key] as string) || ''} onChange={(e) => update(f.key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function EducationEditor() {
  const education = useVaultStore((s) => s.vault?.education ?? []);
  const add = useVaultStore((s) => s.addEducation);
  const remove = useVaultStore((s) => s.removeEducation);
  const update = useVaultStore((s) => s.updateEducation);

  return (
    <div className="form-section">
      <div className="form-section-title">
        Education
        <button onClick={add}>+ Add</button>
      </div>
      {education.map((edu) => (
        <div key={edu.id} className="entry-card vault-entry-card">
          <div className="entry-card-header">
            <strong>{edu.school || 'New Education'}</strong>
            <button className="entry-remove" onClick={() => remove(edu.id)}>Remove</button>
          </div>
          <div className="field-row">
            <div className="field-group"><label className="field-label">School</label><input className="field-input" value={edu.school} onChange={(e) => update(edu.id, 'school', e.target.value)} /></div>
            <div className="field-group"><label className="field-label">Location</label><input className="field-input" value={edu.location} onChange={(e) => update(edu.id, 'location', e.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field-group"><label className="field-label">Degree</label><input className="field-input" value={edu.degree} onChange={(e) => update(edu.id, 'degree', e.target.value)} /></div>
            <div className="field-group"><label className="field-label">GPA</label><input className="field-input" value={edu.gpa || ''} onChange={(e) => update(edu.id, 'gpa', e.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field-group"><label className="field-label">Dates</label><input className="field-input" value={edu.dates} onChange={(e) => update(edu.id, 'dates', e.target.value)} /></div>
            <div className="field-group"><label className="field-label">Coursework</label><input className="field-input" value={edu.coursework || ''} onChange={(e) => update(edu.id, 'coursework', e.target.value)} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CertificationsEditor() {
  const certs = useVaultStore((s) => s.vault?.certifications ?? []);
  const add = useVaultStore((s) => s.addCertification);
  const remove = useVaultStore((s) => s.removeCertification);
  const update = useVaultStore((s) => s.updateCertification);

  return (
    <div className="form-section">
      <div className="form-section-title">
        Certifications
        <button onClick={add}>+ Add</button>
      </div>
      {certs.map((c: Certification) => (
        <div key={c.id} className="entry-card vault-entry-card">
          <div className="entry-card-header">
            <strong>{c.name || 'New Certification'}</strong>
            <button className="entry-remove" onClick={() => remove(c.id)}>Remove</button>
          </div>
          <div className="field-row">
            <div className="field-group"><label className="field-label">Name</label><input className="field-input" value={c.name} onChange={(e) => update(c.id, 'name', e.target.value)} /></div>
            <div className="field-group"><label className="field-label">Issuer</label><input className="field-input" value={c.issuer} onChange={(e) => update(c.id, 'issuer', e.target.value)} /></div>
            <div className="field-group"><label className="field-label">Date</label><input className="field-input" value={c.date} onChange={(e) => update(c.id, 'date', e.target.value)} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExtracurricularsEditor() {
  const extras = useVaultStore((s) => s.vault?.extracurriculars ?? []);
  const add = useVaultStore((s) => s.addExtracurricular);
  const remove = useVaultStore((s) => s.removeExtracurricular);
  const update = useVaultStore((s) => s.updateExtracurricular);

  return (
    <div className="form-section">
      <div className="form-section-title">
        Extracurriculars
        <button onClick={add}>+ Add</button>
      </div>
      {extras.map((e: Extracurricular) => (
        <div key={e.id} className="vault-extra-item">
          <input className="field-input" value={e.text} onChange={(ev) => update(e.id, ev.target.value)} placeholder="Extracurricular activity..." />
          <button className="bullet-remove" onClick={() => remove(e.id)}>&times;</button>
        </div>
      ))}
    </div>
  );
}

function VaultContent() {
  const section = useVaultStore((s) => s.activeSection);

  switch (section) {
    case 'contact': return <ContactEditor />;
    case 'education': return <EducationEditor />;
    case 'certifications': return <CertificationsEditor />;
    case 'summaries': return <VaultSummaryEditor />;
    case 'skills': return <VaultSkillsEditor />;
    case 'experience': return <VaultExperienceEditor />;
    case 'projects': return <VaultProjectEditor />;
    case 'extracurriculars': return <ExtracurricularsEditor />;
    default:
      return (
        <div className="vault-empty-state">
          <p>Select a section from the sidebar to edit your vault data.</p>
          <p>Your vault is the single source of truth for all your career data — experiences, projects, skills, and bullet variants.</p>
        </div>
      );
  }
}

export function VaultView() {
  const vault = useVaultStore((s) => s.vault);
  const loading = useVaultStore((s) => s.loading);
  const loadVault = useVaultStore((s) => s.loadVault);
  const [showResumePicker, setShowResumePicker] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    getVault()
      .then((data) => {
        if (data) loadVault(data);
        else {
          // No vault exists — auto-create an empty one
          createVault({ name: 'My Vault' }).then(loadVault);
        }
      })
      .catch(console.error)
      .finally(() => setInitializing(false));
  }, []);

  const handleImportFromResume = async (resumeId: string) => {
    if (!vault?._id) return;
    const updated = await importFromResume(vault._id, resumeId);
    loadVault(updated);
  };

  if (initializing || loading) {
    return <div className="vault-loading">Loading vault...</div>;
  }

  const expCount = vault?.experience?.length ?? 0;
  const projCount = vault?.projects?.length ?? 0;
  const bulletCount = (vault?.experience ?? []).reduce((sum, e) => sum + e.bulletGroups.reduce((gs, g) => gs + g.bullets.length, 0), 0)
    + (vault?.projects ?? []).reduce((sum, p) => sum + p.bulletGroups.reduce((gs, g) => gs + g.bullets.length, 0), 0);
  const skillCount = (vault?.skills ?? []).reduce((sum, s) => sum + s.skills.split(',').filter(Boolean).length, 0);

  return (
    <div className="vault-view">
      <div className="vault-header">
        <div className="vault-header-info">
          <h2>Profile Vault</h2>
          <div className="vault-stats">
            <span>{expCount} experiences</span>
            <span>{projCount} projects</span>
            <span>{bulletCount} bullets</span>
            <span>{skillCount} skills</span>
          </div>
        </div>
        <button className="primary" onClick={() => setShowResumePicker(true)}>Import from Resume</button>
      </div>
      <div className="vault-body">
        <VaultSidebar />
        <div className="vault-content">
          <VaultContent />
        </div>
      </div>
      {showResumePicker && <VaultResumePickerModal onImport={handleImportFromResume} onClose={() => setShowResumePicker(false)} />}
    </div>
  );
}

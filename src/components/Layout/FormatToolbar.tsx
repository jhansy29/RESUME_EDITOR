import { useState } from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { DEFAULT_FORMAT, DEFAULT_LAYOUT } from '../../types/resume';
import type { FormatSettings } from '../../types/resume';

const FONT_OPTIONS = [
  { label: 'Computer Modern', value: "'Computer Modern Serif', Cambria, 'Times New Roman', serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Georgia', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Cambria', value: "Cambria, Georgia, serif" },
  { label: 'Garamond', value: "'EB Garamond', Garamond, serif" },
  { label: 'Arial', value: "Arial, Helvetica, sans-serif" },
  { label: 'Calibri', value: "Calibri, 'Segoe UI', sans-serif" },
  { label: 'Helvetica', value: "Helvetica, Arial, sans-serif" },
];

function NumCtrl({ label, value, onChange, min, max, step, unit, width }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  width?: number;
}) {
  return (
    <div className="rb-field">
      <span className="rb-field-label">{label}</span>
      <div className="rb-field-ctrl">
        <button className="rb-step-btn" onClick={() => onChange(Math.max(min, +(value - step).toFixed(3)))}>-</button>
        <input
          type="number"
          className="rb-num"
          style={width ? { width } : undefined}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
        />
        <button className="rb-step-btn" onClick={() => onChange(Math.min(max, +(value + step).toFixed(3)))}>+</button>
        {unit && <span className="rb-unit">{unit}</span>}
      </div>
    </div>
  );
}

function RbDropdown({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rb-dropdown">
      <button className={`rb-dropdown-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        {label}
        <span className="rb-chevron">{open ? '\u25B4' : '\u25BE'}</span>
      </button>
      {open && (
        <div className="rb-dropdown-panel" style={wide ? { minWidth: 420 } : undefined}>
          {children}
        </div>
      )}
    </div>
  );
}

const ALIGN_OPTIONS: { value: 'left' | 'center' | 'right'; icon: string; title: string }[] = [
  { value: 'left', icon: '\u2261', title: 'Align left' },
  { value: 'center', icon: '\u2261', title: 'Align center' },
  { value: 'right', icon: '\u2261', title: 'Align right' },
];

function AlignButtons() {
  const layout = useResumeStore((s) => s.data.layout) ?? DEFAULT_LAYOUT;
  const updateLayout = useResumeStore((s) => s.updateLayout);
  const current = layout.header.nameAlignment;

  return (
    <div className="rb-align-group">
      {ALIGN_OPTIONS.map((a) => (
        <button
          key={a.value}
          className={`rb-align-btn${current === a.value ? ' active' : ''}`}
          title={a.title}
          onClick={() => updateLayout('header', { nameAlignment: a.value })}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            {a.value === 'left' && (
              <>
                <rect x="1" y="2" width="14" height="1.5" rx="0.5" fill="currentColor" />
                <rect x="1" y="6" width="10" height="1.5" rx="0.5" fill="currentColor" />
                <rect x="1" y="10" width="12" height="1.5" rx="0.5" fill="currentColor" />
                <rect x="1" y="14" width="8" height="1.5" rx="0.5" fill="currentColor" />
              </>
            )}
            {a.value === 'center' && (
              <>
                <rect x="1" y="2" width="14" height="1.5" rx="0.5" fill="currentColor" />
                <rect x="3" y="6" width="10" height="1.5" rx="0.5" fill="currentColor" />
                <rect x="2" y="10" width="12" height="1.5" rx="0.5" fill="currentColor" />
                <rect x="4" y="14" width="8" height="1.5" rx="0.5" fill="currentColor" />
              </>
            )}
            {a.value === 'right' && (
              <>
                <rect x="1" y="2" width="14" height="1.5" rx="0.5" fill="currentColor" />
                <rect x="5" y="6" width="10" height="1.5" rx="0.5" fill="currentColor" />
                <rect x="3" y="10" width="12" height="1.5" rx="0.5" fill="currentColor" />
                <rect x="7" y="14" width="8" height="1.5" rx="0.5" fill="currentColor" />
              </>
            )}
          </svg>
        </button>
      ))}
    </div>
  );
}

function LayoutDropdown() {
  const layout = useResumeStore((s) => s.data.layout) ?? DEFAULT_LAYOUT;
  const updateLayout = useResumeStore((s) => s.updateLayout);
  const resetLayout = useResumeStore((s) => s.resetLayout);

  return (
    <RbDropdown label="Layout">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label className="layout-toggle">
          <input type="checkbox" checked={layout.education.showEntryBulletMarker} onChange={(e) => updateLayout('education', { showEntryBulletMarker: e.target.checked })} />
          Education bullets
        </label>
        <label className="layout-toggle">
          <input type="checkbox" checked={layout.experience.showEntryBulletMarker} onChange={(e) => updateLayout('experience', { showEntryBulletMarker: e.target.checked })} />
          Experience bullets
        </label>
        <label className="layout-toggle">
          <input type="checkbox" checked={layout.projects.showEntryBulletMarker} onChange={(e) => updateLayout('projects', { showEntryBulletMarker: e.target.checked })} />
          Project bullets
        </label>
        <label className="layout-toggle">
          <input type="checkbox" checked={layout.skills.showCategories} onChange={(e) => updateLayout('skills', { showCategories: e.target.checked })} />
          Skill categories
        </label>
        <label className="layout-toggle">
          <input type="checkbox" checked={layout.skills.showBulletMarker} onChange={(e) => updateLayout('skills', { showBulletMarker: e.target.checked })} />
          Skill bullets
        </label>
        <div className="rb-field">
          <span className="rb-field-label">Skills align</span>
          <select
            className="rb-select"
            value={layout.skills.alignMode ?? 'inline'}
            onChange={(e) => updateLayout('skills', { alignMode: e.target.value as 'aligned' | 'inline' })}
          >
            <option value="inline">Inline (wraps under label)</option>
            <option value="aligned">Aligned columns</option>
          </select>
        </div>
        <button className="rb-reset-btn" onClick={resetLayout}>Reset Layout</button>
      </div>
    </RbDropdown>
  );
}

export function FormatToolbar() {
  const format = useResumeStore((s) => s.data.format) || DEFAULT_FORMAT;
  const updateFormat = useResumeStore((s) => s.updateFormat);
  const resetFormat = useResumeStore((s) => s.resetFormat);
  const u = <K extends keyof FormatSettings>(key: K) => (v: FormatSettings[K]) => updateFormat(key, v);

  return (
    <div className="ribbon">
      {/* ---- Font Group ---- */}
      <RbDropdown label="Font">
        <div className="rb-field">
          <span className="rb-field-label">Family</span>
          <select
            className="rb-select"
            value={format.fontFamily}
            onChange={(e) => updateFormat('fontFamily', e.target.value)}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="rb-row">
          <NumCtrl label="Body" value={format.fontSize} onChange={u('fontSize')} min={7} max={14} step={0.5} unit="pt" />
          <NumCtrl label="Name" value={format.nameFontSize} onChange={u('nameFontSize')} min={14} max={36} step={1} unit="pt" />
        </div>
        <div className="rb-row">
          <NumCtrl label="Contact" value={format.contactFontSize} onChange={u('contactFontSize')} min={7} max={14} step={0.5} unit="pt" />
          <NumCtrl label="Heading" value={format.headingFontSize} onChange={u('headingFontSize')} min={8} max={16} step={0.5} unit="pt" />
        </div>
      </RbDropdown>

      {/* ---- Spacing Group ---- */}
      <RbDropdown label="Spacing">
        <NumCtrl label="Line Height" value={format.lineHeight} onChange={u('lineHeight')} min={0.9} max={2.0} step={0.02} />
        <NumCtrl label="Section Gap" value={format.sectionSpacing} onChange={u('sectionSpacing')} min={0} max={20} step={0.5} unit="pt" />
        <NumCtrl label="Bullet Gap" value={format.bulletSpacing} onChange={u('bulletSpacing')} min={0} max={10} step={0.5} unit="pt" />
      </RbDropdown>

      {/* ---- Margins Group ---- */}
      <RbDropdown label="Margins">
        <div className="rb-row">
          <NumCtrl label="Top" value={format.marginTop} onChange={u('marginTop')} min={0} max={1.5} step={0.02} unit="in" />
          <NumCtrl label="Bottom" value={format.marginBottom} onChange={u('marginBottom')} min={0} max={1.5} step={0.02} unit="in" />
        </div>
        <div className="rb-row">
          <NumCtrl label="Left" value={format.marginLeft} onChange={u('marginLeft')} min={0} max={1.5} step={0.02} unit="in" />
          <NumCtrl label="Right" value={format.marginRight} onChange={u('marginRight')} min={0} max={1.5} step={0.02} unit="in" />
        </div>
      </RbDropdown>

      {/* ---- Align Group ---- */}
      <AlignButtons />

      {/* ---- Layout Group ---- */}
      <LayoutDropdown />

      {/* ---- Reset ---- */}
      <button className="rb-reset-btn rb-reset-inline" onClick={resetFormat}>Reset All</button>
    </div>
  );
}

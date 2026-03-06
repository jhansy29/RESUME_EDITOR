import { useState } from 'react';
import { useResumeStore, type ResumeSection } from '../../hooks/useResumeStore';
import { DEFAULT_SECTION_ORDER } from '../../types/resume';

const EMPTY_CUSTOM_SECTIONS: never[] = [];

const SECTION_META: Record<string, { label: string; icon: string }> = {
  contact: { label: 'Contact', icon: '\u25CB' },
  header: { label: 'Contact', icon: '\u25CB' },
  education: { label: 'Education', icon: '\u25B3' },
  summary: { label: 'Summary', icon: '\u2261' },
  experience: { label: 'Experience', icon: '\u25A1' },
  projects: { label: 'Projects', icon: '\u25C7' },
  skills: { label: 'Skills', icon: '\u2606' },
};

export function SectionSidebar() {
  const activeSection = useResumeStore((s) => s.activeSection);
  const setActiveSection = useResumeStore((s) => s.setActiveSection);
  const sectionOrder = useResumeStore((s) => s.data.sectionOrder) || DEFAULT_SECTION_ORDER;
  const customSections = useResumeStore((s) => s.data.customSections) || EMPTY_CUSTOM_SECTIONS;
  const addCustomSection = useResumeStore((s) => s.addCustomSection);
  const moveSectionOrder = useResumeStore((s) => s.moveSectionOrder);
  const [showInput, setShowInput] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleClick = (key: ResumeSection) => {
    if (activeSection === key) {
      setActiveSection(null);
    } else {
      setActiveSection(key);
    }
  };

  const handleAddSection = () => {
    const title = newTitle.trim();
    if (title) {
      addCustomSection(title);
      setNewTitle('');
      setShowInput(false);
      setTimeout(() => {
        const store = useResumeStore.getState();
        const sections = store.data.customSections || [];
        const last = sections[sections.length - 1];
        if (last) {
          handleClick(`custom-${last.id}`);
        }
      }, 0);
    }
  };

  const handleMove = (e: React.MouseEvent, orderIndex: number, direction: -1 | 1) => {
    e.stopPropagation();
    const targetIndex = orderIndex + direction;
    if (targetIndex < 0 || targetIndex >= sectionOrder.length) return;
    moveSectionOrder(orderIndex, targetIndex);
  };

  // Build ordered sidebar buttons from sectionOrder
  // Each button tracks its index in sectionOrder for move operations
  const orderedButtons: { key: ResumeSection; label: string; icon: string; orderIndex: number }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < sectionOrder.length; i++) {
    const s = sectionOrder[i];
    const sidebarKey = s === 'header' ? 'contact' : s;
    if (seen.has(sidebarKey)) continue;
    seen.add(sidebarKey);

    if (s.startsWith('custom-')) {
      const cs = customSections.find(c => `custom-${c.id}` === s);
      if (cs) {
        orderedButtons.push({ key: s as ResumeSection, label: cs.title, icon: '\u25C6', orderIndex: i });
      }
    } else if (SECTION_META[sidebarKey]) {
      orderedButtons.push({ key: sidebarKey as ResumeSection, ...SECTION_META[sidebarKey], orderIndex: i });
    }
  }
  // Add any standard sections not in the order
  for (const key of ['contact', 'education', 'summary', 'skills', 'experience', 'projects']) {
    if (!seen.has(key) && SECTION_META[key]) {
      orderedButtons.push({ key: key as ResumeSection, ...SECTION_META[key], orderIndex: -1 });
    }
  }
  // Add any custom sections not in the order
  for (const cs of customSections) {
    const key = `custom-${cs.id}`;
    if (!seen.has(key)) {
      orderedButtons.push({ key: key as ResumeSection, label: cs.title, icon: '\u25C6', orderIndex: -1 });
    }
  }

  return (
    <div className="section-sidebar">
      {orderedButtons.map(({ key, label, icon, orderIndex }, btnIdx) => (
        <div key={key} className="section-btn-row">
          <button
            className={`section-btn ${activeSection === key ? 'active' : ''}`}
            onClick={() => handleClick(key)}
            title={label}
          >
            <span className="section-btn-icon">{icon}</span>
            <span className="section-btn-label">{label}</span>
          </button>
          {orderIndex > 0 && (
            <button
              className="section-move-btn"
              title="Move up"
              onClick={(e) => handleMove(e, orderIndex, -1)}
            >
              {'\u25B2'}
            </button>
          )}
          {orderIndex >= 0 && orderIndex < sectionOrder.length - 1 && (
            <button
              className="section-move-btn"
              title="Move down"
              onClick={(e) => handleMove(e, orderIndex, 1)}
            >
              {'\u25BC'}
            </button>
          )}
        </div>
      ))}
      {showInput ? (
        <div className="add-section-input">
          <input
            className="field-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSection();
              if (e.key === 'Escape') { setShowInput(false); setNewTitle(''); }
            }}
            placeholder="Section name"
            autoFocus
          />
          <button className="section-btn" onClick={handleAddSection} title="Add">+</button>
        </div>
      ) : (
        <button
          className="section-btn add-section-btn"
          onClick={() => setShowInput(true)}
          title="Add Section"
        >
          <span className="section-btn-label">+ Add Section</span>
        </button>
      )}
    </div>
  );
}

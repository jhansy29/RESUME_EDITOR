import { useResumeStore } from '../../hooks/useResumeStore';
import { BulletInput } from './BulletInput';
import { SortableList } from './SortableList';
import type { ExperienceEntry, ProjectEntry } from '../../types/resume';

interface Props {
  sectionId: string;
}

function CustomExperienceCard({
  sectionId,
  entry,
  dragListeners,
}: {
  sectionId: string;
  entry: ExperienceEntry;
  dragListeners?: Record<string, unknown>;
}) {
  const remove = useResumeStore((s) => s.removeCustomEntry);
  const update = useResumeStore((s) => s.updateCustomEntry);
  const addBullet = useResumeStore((s) => s.addCustomEntryBullet);
  const removeBullet = useResumeStore((s) => s.removeCustomEntryBullet);
  const updateBullet = useResumeStore((s) => s.updateCustomEntryBullet);
  const reorderBullets = useResumeStore((s) => s.reorderCustomEntryBullets);

  return (
    <div className="entry-card">
      <div className="entry-card-header">
        <span className="drag-handle" {...dragListeners}>{'\u2847'}</span>
        <button className="entry-remove" onClick={() => remove(sectionId, entry.id)}>Remove</button>
      </div>
      <div className="field-row">
        <div className="field-group">
          <label className="field-label">Company</label>
          <input className="field-input" value={entry.company} onChange={(e) => update(sectionId, entry.id, 'company', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Location</label>
          <input className="field-input" value={entry.location} onChange={(e) => update(sectionId, entry.id, 'location', e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field-group">
          <label className="field-label">Role</label>
          <input className="field-input" value={entry.role} onChange={(e) => update(sectionId, entry.id, 'role', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Dates</label>
          <input className="field-input" value={entry.dates} onChange={(e) => update(sectionId, entry.id, 'dates', e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <label className="field-label">Bullets</label>
        <SortableList items={entry.bullets} onReorder={(from, to) => reorderBullets(sectionId, entry.id, from, to)}>
          {entry.bullets.map((b) => (
            <BulletInput
              key={b.id}
              text={b.text}
              onChange={(text) => updateBullet(sectionId, entry.id, b.id, text)}
              onRemove={() => removeBullet(sectionId, entry.id, b.id)}
            />
          ))}
        </SortableList>
        <button className="add-bullet-btn" onClick={() => addBullet(sectionId, entry.id)}>
          + Add Bullet
        </button>
      </div>
    </div>
  );
}

function CustomProjectCard({
  sectionId,
  entry,
  dragListeners,
}: {
  sectionId: string;
  entry: ProjectEntry;
  dragListeners?: Record<string, unknown>;
}) {
  const remove = useResumeStore((s) => s.removeCustomEntry);
  const update = useResumeStore((s) => s.updateCustomEntry);
  const addBullet = useResumeStore((s) => s.addCustomEntryBullet);
  const removeBullet = useResumeStore((s) => s.removeCustomEntryBullet);
  const updateBullet = useResumeStore((s) => s.updateCustomEntryBullet);
  const reorderBullets = useResumeStore((s) => s.reorderCustomEntryBullets);

  return (
    <div className="entry-card">
      <div className="entry-card-header">
        <span className="drag-handle" {...dragListeners}>{'\u2847'}</span>
        <button className="entry-remove" onClick={() => remove(sectionId, entry.id)}>Remove</button>
      </div>
      <div className="field-row">
        <div className="field-group" style={{ flex: 2 }}>
          <label className="field-label">Title</label>
          <input className="field-input" value={entry.title} onChange={(e) => update(sectionId, entry.id, 'title', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Date</label>
          <input className="field-input" value={entry.date || ''} onChange={(e) => update(sectionId, entry.id, 'date', e.target.value)} />
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">Tech Stack</label>
        <input className="field-input" value={entry.techStack || ''} onChange={(e) => update(sectionId, entry.id, 'techStack', e.target.value)} placeholder="Python, PyTorch, AWS" />
      </div>
      <div style={{ marginTop: 8 }}>
        <label className="field-label">Bullets</label>
        <SortableList items={entry.bullets} onReorder={(from, to) => reorderBullets(sectionId, entry.id, from, to)}>
          {entry.bullets.map((b) => (
            <BulletInput
              key={b.id}
              text={b.text}
              onChange={(text) => updateBullet(sectionId, entry.id, b.id, text)}
              onRemove={() => removeBullet(sectionId, entry.id, b.id)}
            />
          ))}
        </SortableList>
        <button className="add-bullet-btn" onClick={() => addBullet(sectionId, entry.id)}>
          + Add Bullet
        </button>
      </div>
    </div>
  );
}

export function CustomSectionForm({ sectionId }: Props) {
  const section = useResumeStore((s) =>
    s.data.customSections?.find((cs) => cs.id === sectionId)
  );
  const updateTitle = useResumeStore((s) => s.updateCustomSectionTitle);
  const removeSection = useResumeStore((s) => s.removeCustomSection);
  const addItem = useResumeStore((s) => s.addCustomItem);
  const removeItem = useResumeStore((s) => s.removeCustomItem);
  const updateItem = useResumeStore((s) => s.updateCustomItem);
  const reorderItems = useResumeStore((s) => s.reorderCustomItems);
  const addEntry = useResumeStore((s) => s.addCustomEntry);
  const reorderEntries = useResumeStore((s) => s.reorderCustomEntries);
  const setActiveSection = useResumeStore((s) => s.setActiveSection);

  if (!section) return null;

  const handleRemoveSection = () => {
    setActiveSection(null);
    removeSection(sectionId);
  };

  const format = section.format || 'bullets';

  return (
    <div className="form-section">
      <div className="form-section-title">
        <input
          className="field-input"
          value={section.title}
          onChange={(e) => updateTitle(sectionId, e.target.value)}
          placeholder="Section Title"
          style={{ fontWeight: 'bold', fontSize: 14 }}
        />
        <button onClick={handleRemoveSection} style={{ color: '#e53e3e' }}>
          Delete Section
        </button>
      </div>

      {format === 'bullets' && (
        <>
          <SortableList
            items={section.items}
            onReorder={(from, to) => reorderItems(sectionId, from, to)}
          >
            {section.items.map((item) => (
              <BulletInput
                key={item.id}
                text={item.text}
                onChange={(text) => updateItem(sectionId, item.id, text)}
                onRemove={() => removeItem(sectionId, item.id)}
              />
            ))}
          </SortableList>
          <button
            className="add-bullet-btn"
            onClick={() => addItem(sectionId)}
          >
            + Add Item
          </button>
        </>
      )}

      {format === 'experience' && (
        <>
          <SortableList
            items={section.entries || []}
            onReorder={(from, to) => reorderEntries(sectionId, from, to)}
          >
            {(section.entries || []).map((entry) => (
              <CustomExperienceCard
                key={entry.id}
                sectionId={sectionId}
                entry={entry as ExperienceEntry}
              />
            ))}
          </SortableList>
          <button className="add-bullet-btn" onClick={() => addEntry(sectionId)}>
            + Add Entry
          </button>
        </>
      )}

      {format === 'projects' && (
        <>
          <SortableList
            items={section.entries || []}
            onReorder={(from, to) => reorderEntries(sectionId, from, to)}
          >
            {(section.entries || []).map((entry) => (
              <CustomProjectCard
                key={entry.id}
                sectionId={sectionId}
                entry={entry as ProjectEntry}
              />
            ))}
          </SortableList>
          <button className="add-bullet-btn" onClick={() => addEntry(sectionId)}>
            + Add Entry
          </button>
        </>
      )}
    </div>
  );
}

import { useResumeStore } from '../../hooks/useResumeStore';
import { BulletInput } from './BulletInput';
import { SortableList } from './SortableList';
import type { CustomSection } from '../../types/resume';

interface Props {
  sectionId: string;
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
  const setActiveSection = useResumeStore((s) => s.setActiveSection);

  if (!section) return null;

  const handleRemoveSection = () => {
    setActiveSection(null);
    removeSection(sectionId);
  };

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
    </div>
  );
}

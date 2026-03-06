import { useResumeStore } from '../../hooks/useResumeStore';
import { EditableText } from './EditableText';
import type { CustomSection } from '../../types/resume';

interface Props {
  section: CustomSection;
  bulletStyle?: React.CSSProperties;
}

export function CustomSectionPreview({ section, bulletStyle }: Props) {
  const updateCustomItem = useResumeStore((s) => s.updateCustomItem);

  if (section.items.length === 0) return null;

  return (
    <ul className="bullet-list" style={bulletStyle}>
      {section.items.map((item) => (
        <EditableText
          key={item.id}
          tag="li"
          value={item.text}
          onSave={(v) => updateCustomItem(section.id, item.id, v)}
          placeholder="Item text"
        />
      ))}
    </ul>
  );
}

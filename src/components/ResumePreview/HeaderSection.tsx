import { useResumeStore } from '../../hooks/useResumeStore';
import { EditableText } from './EditableText';
import { DEFAULT_LAYOUT } from '../../types/resume';
import type { ContactInfo, HeaderLayout } from '../../types/resume';

interface Props {
  contact: ContactInfo;
  nameStyle?: React.CSSProperties;
  contactStyle?: React.CSSProperties;
  layout?: HeaderLayout;
}

export function HeaderSection({ contact, nameStyle, contactStyle, layout }: Props) {
  const updateContact = useResumeStore((s) => s.updateContact);
  const lo = layout ?? DEFAULT_LAYOUT.header;

  const allItems: { key: keyof ContactInfo; value: string }[] = [
    { key: 'phone', value: contact.phone },
    { key: 'email', value: contact.email },
    { key: 'linkedin', value: contact.linkedin },
    ...(contact.github ? [{ key: 'github' as const, value: contact.github }] : []),
    ...(contact.portfolio ? [{ key: 'portfolio' as const, value: contact.portfolio }] : []),
    ...(contact.googleScholar ? [{ key: 'googleScholar' as const, value: contact.googleScholar }] : []),
  ];

  // Filter and order by layout contactFields
  const items = lo.contactFields
    .map((field) => allItems.find((item) => item.key === field))
    .filter((item): item is { key: keyof ContactInfo; value: string } => !!item && !!item.value);

  const contactLayoutClass =
    lo.contactLayout === 'stacked' ? 'contact-stacked' :
    lo.contactLayout === 'two-column' ? 'contact-two-col' : '';

  return (
    <div>
      <EditableText
        tag="div"
        className="resume-name"
        style={{ ...nameStyle, textAlign: lo.nameAlignment }}
        value={contact.name}
        onSave={(v) => updateContact('name', v)}
        placeholder="Your Name"
      />
      <div
        className={`resume-contact ${contactLayoutClass}`.trim()}
        style={{
          ...contactStyle,
          ...(lo.contactLayout === 'inline' ? { ['--contact-sep' as string]: `'${lo.contactSeparator}'` } : {}),
        }}
      >
        {items.map((item) => (
          <span key={item.key}>
            <EditableText
              value={item.value}
              onSave={(v) => updateContact(item.key, v)}
              placeholder={item.key}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

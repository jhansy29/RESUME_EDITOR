import React from 'react';
import { useResumeStore } from '../../hooks/useResumeStore';
import { EditableText } from './EditableText';
import { GapHandle } from './GapHandle';
import type { CustomSection } from '../../types/resume';

interface Props {
  section: CustomSection;
  bulletStyle?: React.CSSProperties;
}

export function CustomSectionPreview({ section, bulletStyle }: Props) {
  const updateCustomItem = useResumeStore((s) => s.updateCustomItem);
  const entryGaps = useResumeStore((s) => s.data.entryGaps);
  const bulletSpacing = useResumeStore((s) => s.data.format?.bulletSpacing ?? 0);
  const updateEntryGap = useResumeStore((s) => s.updateEntryGap);

  if (section.items.length === 0) return null;

  return (
    <div className="bullet-list" style={bulletStyle}>
      {section.items.map((item, idx) => {
        const bGap = entryGaps?.[item.id] ?? bulletSpacing;
        return (
          <React.Fragment key={item.id}>
            {idx > 0 && (
              <GapHandle
                gap={bGap}
                defaultGap={bulletSpacing}
                onChange={(newGap) => updateEntryGap(item.id, newGap)}
              />
            )}
            <EditableText
              tag="div"
              className="bullet-item"
              value={item.text}
              onSave={(v) => updateCustomItem(section.id, item.id, v)}
              placeholder="Item text"
              style={idx > 0 ? { marginTop: `${bGap}pt` } : undefined}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

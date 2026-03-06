import React from 'react';

export function parseBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// For DOCX export: returns segments with bold flag
export function parseBoldSegments(text: string): { text: string; bold: boolean }[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .filter(p => p.length > 0)
    .map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return { text: part.slice(2, -2), bold: true };
      }
      return { text: part, bold: false };
    });
}

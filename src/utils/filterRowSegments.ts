import type { RowSegment } from '../types/resume';

/**
 * Filter out field segments whose value is empty, then clean up
 * orphaned spacers (leading, trailing, consecutive).
 * Returns null if the entire row is empty.
 */
export function filterRowSegments(
  row: RowSegment[],
  values: Record<string, string>,
): RowSegment[] | null {
  // 1. Remove field segments with empty values
  let filtered = row.filter((seg) => {
    if (seg.type === 'field') {
      const v = values[seg.value];
      return v !== undefined && v !== '';
    }
    return true; // keep spacers and literals
  });

  // 2. Remove literals that are now at the edges or between spacers only
  //    (e.g. a " | " literal between two fields where one was removed)
  filtered = filtered.filter((seg, i) => {
    if (seg.type !== 'literal') return true;
    const prev = filtered[i - 1];
    const next = filtered[i + 1];
    const prevIsField = prev && prev.type === 'field';
    const nextIsField = next && next.type === 'field';
    // Keep literal only if it has a field on both sides
    return prevIsField && nextIsField;
  });

  // 3. Clean up spacers: remove leading, trailing, and consecutive
  filtered = filtered.filter((seg, i) => {
    if (seg.type !== 'spacer') return true;
    // Remove leading spacer
    if (i === 0) return false;
    // Remove trailing spacer
    if (i === filtered.length - 1) return false;
    // Remove consecutive spacers (keep first)
    const prev = filtered[i - 1];
    if (prev && prev.type === 'spacer') return false;
    return true;
  });

  // Re-check trailing spacer after cleanup
  while (filtered.length > 0 && filtered[filtered.length - 1].type === 'spacer') {
    filtered.pop();
  }
  while (filtered.length > 0 && filtered[0].type === 'spacer') {
    filtered.shift();
  }

  // If only spacers/literals remain (no fields), return null
  const hasFields = filtered.some((s) => s.type === 'field');
  return hasFields ? filtered : null;
}

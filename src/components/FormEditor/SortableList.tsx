import React from 'react';

interface SortableListProps {
  items: { id: string }[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  children: React.ReactNode;
}

export function SortableList({ children }: SortableListProps) {
  return <>{children}</>;
}

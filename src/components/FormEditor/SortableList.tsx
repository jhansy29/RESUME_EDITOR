import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableListProps {
  items: { id: string }[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  children: React.ReactNode;
}

function SortableItem({ id, children }: { id: string; children: React.ReactElement }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Clone the child to inject dragListeners prop
  const child = React.cloneElement(children, { dragListeners: { ...attributes, ...listeners } });

  return (
    <div ref={setNodeRef} style={style}>
      {child}
    </div>
  );
}

export function SortableList({ items, onReorder, children }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = items.findIndex((item) => item.id === active.id);
    const toIndex = items.findIndex((item) => item.id === over.id);
    if (fromIndex >= 0 && toIndex >= 0) {
      onReorder(fromIndex, toIndex);
    }
  };

  const childArray = React.Children.toArray(children);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {childArray.map((child, idx) => {
          const item = items[idx];
          if (!item || !React.isValidElement(child)) return child;
          return (
            <SortableItem key={item.id} id={item.id}>
              {child}
            </SortableItem>
          );
        })}
      </SortableContext>
    </DndContext>
  );
}

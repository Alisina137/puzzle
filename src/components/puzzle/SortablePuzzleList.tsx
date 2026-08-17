'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PuzzleCard } from './PuzzleCard';
import { Loader2 } from 'lucide-react';

interface Puzzle {
  id: string;
  position: number;
  displayNumber: number;
  puzzle: {
    id: string;
    type: string;
    difficulty: string;
    qualityScore: number | null;
    data: {
      grid: string[][];
      words: string[];
    };
  };
  puzzleVersion: {
    id: string;
    versionNumber: number;
  };
  solution: any;
}

interface SortablePuzzleListProps {
  puzzles: Puzzle[];
  bookId: string;
  onReorder?: (puzzleIds: string[]) => Promise<void>;
  onRegenerate?: (puzzleId: string) => Promise<void>;
  onDelete?: (puzzleId: string) => Promise<void>;
  loading?: boolean;
  onPuzzleUpdate?: (updatedPuzzle: any) => void;
}

export function SortablePuzzleList({
  puzzles: initialPuzzles,
  bookId,
  onReorder,
  onRegenerate,
  onDelete,
  loading = false,
  onPuzzleUpdate,
}: SortablePuzzleListProps) {
  const [items, setItems] = useState(initialPuzzles);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handlePuzzleUpdate = (updatedPuzzle: any) => {
    // Update the local state
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === updatedPuzzle.id ? updatedPuzzle : item
      )
    );

    // Notify parent
    if (onPuzzleUpdate) {
      onPuzzleUpdate(updatedPuzzle);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      const reorderedIds = newItems.map((item) => item.id);
      
      if (onReorder) {
        setIsReordering(true);
        try {
          await onReorder(reorderedIds);
        } catch (error) {
          console.error('Failed to reorder puzzles:', error);
          setItems(items);
        } finally {
          setIsReordering(false);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No puzzles generated yet</p>
        <p className="text-sm mt-1">Puzzles will appear here when generation is complete</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((puzzle) => (
            <PuzzleCard
              key={puzzle.id}
              puzzle={puzzle}
              bookId={bookId}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
              onUpdate={handlePuzzleUpdate}
              isDraggable={true}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
'use client';

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

interface PuzzleListProps {
  puzzles: Puzzle[];
  bookId: string;
  onRegenerate?: (puzzleId: string) => Promise<void>;
  onDelete?: (puzzleId: string) => Promise<void>;
  onReorder?: (puzzleIds: string[]) => Promise<void>;
  loading?: boolean;
  onPuzzleUpdate?: (updatedPuzzle: any) => void;
}

export function PuzzleList({
  puzzles,
  bookId,
  onRegenerate,
  onDelete,
  onReorder,
  loading = false,
  onPuzzleUpdate,
}: PuzzleListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (puzzles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No puzzles generated yet</p>
        <p className="text-sm mt-1">Puzzles will appear here when generation is complete</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {puzzles.map((puzzle) => (
        <PuzzleCard
          key={puzzle.id}
          puzzle={puzzle}
          bookId={bookId}
          onRegenerate={onRegenerate}
          onDelete={onDelete}
          onUpdate={onPuzzleUpdate}
        />
      ))}
    </div>
  );
}
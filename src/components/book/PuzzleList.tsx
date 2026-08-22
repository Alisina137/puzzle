"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Puzzle {
  id: string;
  displayNumber: number;
  title?: string;
  difficultyLabel?: string;
  difficultyScore?: number;
}

interface PuzzleListProps {
  puzzles: Puzzle[];
  bookId: string;
  onReorder?: (puzzles: Puzzle[]) => void;
  className?: string;
}

export function PuzzleList({
  puzzles: initialPuzzles,
  bookId,
  onReorder,
  className,
}: PuzzleListProps) {
  const [puzzles, setPuzzles] = useState<Puzzle[]>(initialPuzzles);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // For better visual feedback
    setTimeout(() => {
      const element = e.currentTarget as HTMLElement;
      element.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = "1";
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggingIndex === null || draggingIndex === dropIndex) {
      return;
    }

    // Reorder the puzzles
    const newPuzzles = [...puzzles];
    const [draggedPuzzle] = newPuzzles.splice(draggingIndex, 1);
    newPuzzles.splice(dropIndex, 0, draggedPuzzle);

    // Update display numbers
    const updatedPuzzles = newPuzzles.map((puzzle, index) => ({
      ...puzzle,
      displayNumber: index + 1,
    }));

    setPuzzles(updatedPuzzles);
    setIsUpdating(true);

    try {
      // Send the new order to the server
      const puzzleOrder = updatedPuzzles.map((p) => p.id);
      const response = await fetch(`/api/books/${bookId}/puzzles/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ puzzleOrder }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reorder puzzles");
      }

      toast.success("Puzzles reordered successfully");
      onReorder?.(updatedPuzzles);
    } catch (error) {
      console.error("Error reordering puzzles:", error);
      toast.error("Failed to reorder puzzles");
      // Revert to original order
      setPuzzles(initialPuzzles);
    } finally {
      setIsUpdating(false);
    }
  };

  const getDifficultyColor = (label?: string) => {
    switch (label) {
      case "Easy":
        return "bg-green-100 text-green-700";
      case "Medium":
        return "bg-yellow-100 text-yellow-700";
      case "Hard":
        return "bg-orange-100 text-orange-700";
      case "Expert":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (puzzles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No puzzles in this book yet.</p>
        <p className="text-sm">Generate puzzles to see them here.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {isUpdating && (
        <div className="flex items-center justify-center py-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin mr-2" />
          Updating order...
        </div>
      )}

      {puzzles.map((puzzle, index) => (
        <div
          key={puzzle.id}
          draggable={!isUpdating}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          className={cn(
            "flex items-center gap-4 p-3 bg-white rounded-lg border transition-all duration-200 cursor-grab",
            "hover:border-blue-300 hover:shadow-sm",
            draggingIndex === index && "opacity-50",
            dragOverIndex === index && "border-blue-500 bg-blue-50 shadow-md scale-[1.02]",
            isUpdating && "cursor-default opacity-70"
          )}
        >
          <div className="flex items-center justify-center text-gray-400 cursor-grab">
            <GripVertical size={20} />
          </div>

          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
            {puzzle.displayNumber}
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">
              {puzzle.title || `Puzzle ${puzzle.displayNumber}`}
            </p>
          </div>

          {puzzle.difficultyLabel && (
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-semibold rounded-full",
                getDifficultyColor(puzzle.difficultyLabel)
              )}
            >
              {puzzle.difficultyLabel}
              {puzzle.difficultyScore !== undefined && ` (${puzzle.difficultyScore})`}
            </span>
          )}

          <div className="text-xs text-gray-400">
            #{puzzle.id.slice(0, 6)}
          </div>
        </div>
      ))}
    </div>
  );
}

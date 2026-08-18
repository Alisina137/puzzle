"use client";

import { useState } from "react";
import { RefreshCw, Trash2, Eye, Loader2, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

interface PuzzleCardProps {
  puzzle: {
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
  };
  bookId: string;
  onRegenerate?: (puzzleId: string) => Promise<void>;
  onDelete?: (puzzleId: string) => Promise<void>;
  onUpdate?: (updatedPuzzle: any) => void;
  isDraggable?: boolean;
}

export function PuzzleCard({
  puzzle,
  bookId,
  onRegenerate,
  onDelete,
  onUpdate,
  isDraggable = false,
}: PuzzleCardProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState(puzzle);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: puzzle.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRegenerate = async () => {
    if (isRegenerating) return;

    const toastId = toast.loading("Regenerating puzzle...");

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/books/" + bookId + "/puzzles/" + currentPuzzle.id + "/regenerate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to regenerate puzzle");
      }

      const updatedPuzzle = result.data.bookPuzzle;
      setCurrentPuzzle(updatedPuzzle);

      if (onUpdate) {
        onUpdate(updatedPuzzle);
      }

      toast.dismiss(toastId);
      toast.success("Puzzle regenerated successfully! 🔄");
    } catch (err: any) {
      setError(err.message || "Failed to regenerate puzzle");
      console.error("Regeneration error:", err);
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to regenerate puzzle");
    } finally {
      setIsRegenerating(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      hard: "bg-red-100 text-red-700",
    };
    return colors[difficulty] || "bg-gray-100 text-gray-700";
  };

  const previewWords = currentPuzzle.puzzle.data.words.slice(0, 5);
  const remainingWords = currentPuzzle.puzzle.data.words.length - 5;
  const gridPreview = currentPuzzle.puzzle.data.grid
    .slice(0, 5)
    .map((row) => row.slice(0, 5));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isDraggable && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            >
              <GripVertical size={16} />
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">
            Puzzle #{currentPuzzle.displayNumber}
          </span>
        </div>
        <span
          className={
            "px-2 py-0.5 text-xs rounded-full " +
            getDifficultyColor(currentPuzzle.puzzle.difficulty)
          }
        >
          {currentPuzzle.puzzle.difficulty}
        </span>
      </div>

      {/* Grid Preview */}
      <div className="bg-gray-50 rounded-lg p-2 mb-3">
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
        >
          {gridPreview.map((row, i) =>
            row.map((cell, j) => (
              <div
                key={i + "-" + j}
                className="aspect-square flex items-center justify-center text-xs font-mono bg-white rounded"
              >
                {cell}
              </div>
            )),
          )}
        </div>
        {currentPuzzle.puzzle.data.grid.length > 5 && (
          <div className="text-xs text-gray-400 text-center mt-1">
            ... {currentPuzzle.puzzle.data.grid.length}x
            {currentPuzzle.puzzle.data.grid[0].length} grid
          </div>
        )}
      </div>

      {/* Words */}
      <div className="mb-3">
        <div className="text-xs text-gray-400 font-medium mb-1">
          Words to find:
        </div>
        <div className="flex flex-wrap gap-1">
          {previewWords.map((word, index) => (
            <span
              key={index}
              className="text-xs bg-gray-100 px-2 py-0.5 rounded"
            >
              {word}
            </span>
          ))}
          {remainingWords > 0 && (
            <span className="text-xs text-gray-400 px-2 py-0.5 rounded">
              +{remainingWords} more
            </span>
          )}
        </div>
      </div>

      {/* Quality Score and Version */}
      <div className="text-xs text-gray-500 mb-3 flex items-center justify-between">
        <span>
          Quality:{" "}
          <span className="font-medium">
            {currentPuzzle.puzzle.qualityScore || "N/A"}/100
          </span>
        </span>
        <span className="text-gray-400">
          v{currentPuzzle.puzzleVersion.versionNumber}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
        >
          <Eye size={14} />
          Preview
        </button>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          {isRegenerating ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              Regenerate
            </>
          )}
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(currentPuzzle.id)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-600 transition-colors ml-auto"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                Puzzle #{currentPuzzle.displayNumber}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ?
              </button>
            </div>
            <div
              className="grid gap-0.5"
              style={{
                gridTemplateColumns:
                  "repeat(" +
                  currentPuzzle.puzzle.data.grid[0].length +
                  ", 1fr)",
              }}
            >
              {currentPuzzle.puzzle.data.grid.map((row, i) =>
                row.map((cell, j) => (
                  <div
                    key={i + "-" + j}
                    className="aspect-square flex items-center justify-center text-sm font-mono bg-gray-50 border border-gray-200"
                  >
                    {cell}
                  </div>
                )),
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700">Words:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {currentPuzzle.puzzle.data.words.map((word, index) => (
                  <span
                    key={index}
                    className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

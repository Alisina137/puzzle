"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  GripVertical,
} from "lucide-react";
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
  isDeleting?: boolean;
}

// Helper: Get column label (A, B, C, ...)
const getColumnLabel = (index: number): string => {
  return String.fromCharCode(65 + index);
};

export function PuzzleCard({
  puzzle,
  bookId,
  onRegenerate,
  onDelete,
  onUpdate,
  isDraggable = false,
  isDeleting = false,
}: PuzzleCardProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
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
    disabled: !isDraggable || isDeleting,
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

  const handleDelete = async () => {
    if (isDeleting || !onDelete) return;
    if (
      !confirm(
        `Delete Puzzle #${currentPuzzle.displayNumber}? This action cannot be undone.`,
      )
    ) {
      return;
    }
    await onDelete(currentPuzzle.id);
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

  // Get solution data for word coordinates
  // Get solution data for word coordinates with direction
  const getWordSolution = (word: string): string => {
    const solutionData = currentPuzzle.solution?.data as any;
    if (!solutionData?.words) return "";

    const found = solutionData.words.find(
      (w: any) => w.word === word || w.word?.toUpperCase() === word,
    );

    if (!found) return "";

    const startRow = getColumnLabel(found.startRow ?? 0);
    const startCol = (found.startCol ?? 0) + 1;
    const endRow = getColumnLabel(found.endRow ?? found.startRow ?? 0);
    const endCol = (found.endCol ?? found.startCol ?? 0) + 1;

    // Calculate direction
    const dr = (found.endRow ?? found.startRow ?? 0) - (found.startRow ?? 0);
    const dc = (found.endCol ?? found.startCol ?? 0) - (found.startCol ?? 0);

    let direction = "";

    // Determine direction based on row and column changes
    if (dr === 0 && dc > 0) direction = "→";
    else if (dr === 0 && dc < 0) direction = "←";
    else if (dr > 0 && dc === 0) direction = "↓";
    else if (dr < 0 && dc === 0) direction = "↑";
    else if (dr > 0 && dc > 0) direction = "↘";
    else if (dr < 0 && dc < 0) direction = "↖";
    else if (dr > 0 && dc < 0) direction = "↙";
    else if (dr < 0 && dc > 0) direction = "↗";

    return `${startRow}${startCol} → ${endRow}${endCol} ${direction}`;
  };
  // Check if a cell is part of the solution
  const isCellInSolution = (rowIndex: number, colIndex: number): boolean => {
    const solutionData = currentPuzzle.solution?.data as any;
    if (!solutionData?.highlightedGrid) return false;
    return solutionData.highlightedGrid[rowIndex]?.[colIndex] === true;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-4 ${
        isDeleting ? "opacity-50" : ""
      }`}
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

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-800">
                Puzzle #{currentPuzzle.displayNumber}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  {showSolution ? (
                    <>
                      <EyeOff size={16} />
                      Hide Solutions
                    </>
                  ) : (
                    <>
                      <Eye size={16} />
                      Show Solutions
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Main Content: Left (Words) + Right (Grid) */}
            <div className="flex-1 overflow-hidden flex flex-row">
              {/* Left Sidebar - Words */}
              <div className="w-[25%] min-w-[180px] flex-shrink-0 p-4 overflow-y-auto border-r border-gray-200 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {currentPuzzle.puzzle.data.words.length}
                  </span>
                  Words to Find
                </h4>
                <div className="space-y-2">
                  {currentPuzzle.puzzle.data.words.map((word, index) => {
                    const coords = getWordSolution(word);
                    return (
                      <div
                        key={`word-${index}-${word}`}
                        className={`p-2.5 rounded-lg border transition-all ${
                          showSolution && coords
                            ? "border-green-300 bg-green-50"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            showSolution && coords
                              ? "text-green-700"
                              : "text-gray-800"
                          }`}
                        >
                          {word}
                        </span>
                        {showSolution && coords && (
                          <div className="text-xs text-gray-500 mt-1 font-mono">
                            {coords}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side - Puzzle Grid */}
              <div className="w-[75%] flex-1 overflow-auto bg-white p-4">
                <div className="flex items-start justify-center w-full min-h-full">
                  <div
                    className="grid gap-0.5"
                    style={{
                      gridTemplateColumns: `28px repeat(${currentPuzzle.puzzle.data.grid[0]?.length || 1}, minmax(28px, 1fr))`,
                      width: "100%",
                      maxWidth: "100%",
                    }}
                  >
                    {/* Top-left corner */}
                    <div className="sticky top-0 z-10 bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500 border-b border-gray-300 border-r">
                      &nbsp;
                    </div>

                    {/* Column headers (numbers) - STICKY TOP */}
                    {currentPuzzle.puzzle.data.grid[0]?.map((_, colIndex) => (
                      <div
                        key={`col-${colIndex}`}
                        className="sticky top-0 z-10 bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-700 border-b border-gray-300"
                        style={{ minHeight: "24px" }}
                      >
                        {colIndex + 1}
                      </div>
                    ))}

                    {/* Grid rows with row headers */}
                    {currentPuzzle.puzzle.data.grid.map((row, rowIndex) => (
                      <React.Fragment key={`row-group-${rowIndex}`}>
                        {/* Row header (letter) - STICKY LEFT */}
                        <div
                          className="sticky left-0 z-10 bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-700 border-r border-gray-300"
                          style={{ minWidth: "28px" }}
                        >
                          {getColumnLabel(rowIndex)}
                        </div>

                        {/* Grid cells */}
                        {row.map((cell, colIndex) => {
                          const inSolution = isCellInSolution(
                            rowIndex,
                            colIndex,
                          );
                          return (
                            <div
                              key={`cell-${rowIndex}-${colIndex}`}
                              className={`flex items-center justify-center font-mono border border-gray-200 rounded transition-all ${
                                inSolution && showSolution
                                  ? "bg-green-500 text-white font-bold border-green-600"
                                  : "bg-white text-gray-800"
                              }`}
                              style={{
                                aspectRatio: "1/1",
                                minWidth: "28px",
                                minHeight: "28px",
                                width: "100%",
                                height: "100%",
                                fontSize: "clamp(10px, 1.2vw, 18px)",
                              }}
                            >
                              {cell}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0 text-xs text-gray-400 text-right">
              {currentPuzzle.puzzle.data.grid.length}x
              {currentPuzzle.puzzle.data.grid[0]?.length || 0} grid ·{" "}
              {currentPuzzle.puzzle.data.words.length} words
              {showSolution && " · Solutions shown"}
            </div>
          </div>
        </div>
      )}

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
          disabled={isRegenerating || isDeleting}
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
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-600 transition-colors ml-auto disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-800">
                Puzzle #{currentPuzzle.displayNumber}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  {showSolution ? (
                    <>
                      <EyeOff size={16} />
                      Hide Solutions
                    </>
                  ) : (
                    <>
                      <Eye size={16} />
                      Show Solutions
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-row">
              {/* Left Sidebar - Words with coordinates */}
              <div className="w-[25%] min-w-[180px] flex-shrink-0 p-4 overflow-y-auto border-r border-gray-200 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {currentPuzzle.puzzle.data.words.length}
                  </span>
                  Words to Find
                </h4>
                <div className="space-y-2">
                  {currentPuzzle.puzzle.data.words.map((word, index) => {
                    const coords = getWordSolution(word);
                    return (
                      <div
                        key={index}
                        className={`p-2.5 rounded-lg border transition-all ${
                          showSolution && coords
                            ? "border-green-300 bg-green-50"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            showSolution && coords
                              ? "text-green-700"
                              : "text-gray-800"
                          }`}
                        >
                          {word}
                        </span>
                        {showSolution && coords && (
                          <div className="text-xs text-gray-500 mt-1 font-mono">
                            {coords}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side - Puzzle Grid with Labels */}
              <div className="w-[75%] flex-1 overflow-auto bg-white p-4">
                <div className="flex items-start justify-center w-full min-h-full">
                  <div
                    className="grid gap-0.5"
                    style={{
                      gridTemplateColumns: `28px repeat(${currentPuzzle.puzzle.data.grid[0]?.length || 1}, minmax(28px, 1fr))`,
                      width: "100%",
                      maxWidth: "100%",
                    }}
                  >
                    {/* Top-left corner */}
                    <div className="sticky top-0 z-10 bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500 border-b border-gray-300 border-r">
                      &nbsp;
                    </div>

                    {/* Column headers (numbers) - STICKY TOP */}
                    {currentPuzzle.puzzle.data.grid[0]?.map((_, colIndex) => (
                      <div
                        key={`col-${colIndex}`}
                        className="sticky top-0 z-10 bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-700 border-b border-gray-300"
                        style={{ minHeight: "24px" }}
                      >
                        {colIndex + 1}
                      </div>
                    ))}

                    {/* Grid rows with row headers */}
                    {currentPuzzle.puzzle.data.grid.map((row, rowIndex) => (
                      <>
                        {/* Row header (letter) - STICKY LEFT */}
                        <div
                          key={`row-${rowIndex}`}
                          className="sticky left-0 z-10 bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-700 border-r border-gray-300"
                          style={{ minWidth: "28px" }}
                        >
                          {getColumnLabel(rowIndex)}
                        </div>

                        {/* Grid cells */}
                        {row.map((cell, colIndex) => {
                          const inSolution = isCellInSolution(
                            rowIndex,
                            colIndex,
                          );
                          return (
                            <div
                              key={`${rowIndex}-${colIndex}`}
                              className={`flex items-center justify-center font-mono border border-gray-200 rounded transition-all ${
                                inSolution && showSolution
                                  ? "bg-green-500 text-white font-bold border-green-600"
                                  : "bg-white text-gray-800"
                              }`}
                              style={{
                                aspectRatio: "1/1",
                                minWidth: "28px",
                                minHeight: "28px",
                                width: "100%",
                                height: "100%",
                                fontSize: "clamp(10px, 1.2vw, 18px)",
                              }}
                            >
                              {cell}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0 text-xs text-gray-400 text-right">
              {currentPuzzle.puzzle.data.grid.length}x
              {currentPuzzle.puzzle.data.grid[0]?.length || 0} grid ·{" "}
              {currentPuzzle.puzzle.data.words.length} words
              {showSolution && " · Solutions shown"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

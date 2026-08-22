"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List,
  Eye,
  EyeOff,
  Download,
  Printer,
} from "lucide-react";

interface PuzzlePreviewData {
  id: string;
  displayNumber: number;
  grid: string[][];
  words: string[];
  placedWords: any[];
  solution: any;
  difficultyScore?: number;
  difficultyLabel?: string;
}

interface BookPreviewData {
  bookId: string;
  title: string;
  theme: string;
  puzzleCount: number;
  puzzles: PuzzlePreviewData[];
  targetAudience?: string;
  difficultyLevel?: string;
}

interface BookPreviewProps {
  book: BookPreviewData;
  className?: string;
  onExport?: () => void;
  onPrint?: () => void;
}

export function BookPreview({
  book,
  className,
  onExport,
  onPrint,
}: BookPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");

  const totalPages = book.puzzles.length;
  const currentPuzzle = book.puzzles[currentPage];

  const goToNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (index: number) => {
    setCurrentPage(index);
  };

  const renderGrid = (grid: string[][], solution?: any) => {
    if (!grid || grid.length === 0) {
      return <p className="text-gray-400">No grid data available</p>;
    }

    const size = grid.length;

    return (
      <div className="inline-block">
        <div
          className="grid gap-0.5"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(28px, 1fr))`,
          }}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isInSolution =
                solution?.grid?.[rowIndex]?.[colIndex] || false;
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-sm font-mono border border-gray-200 rounded",
                    cell ? "bg-white text-gray-800" : "bg-gray-100",
                    isInSolution &&
                      showSolution &&
                      "bg-green-100 border-green-300",
                  )}
                >
                  {cell || ""}
                </div>
              );
            }),
          )}
        </div>
      </div>
    );
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

  if (totalPages === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No puzzles to preview.</p>
        <p className="text-sm">Generate puzzles first.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{book.title}</h2>
          <p className="text-sm text-gray-500">
            {book.puzzleCount} puzzles � Theme: {book.theme}
            {book.targetAudience && ` � Audience: ${book.targetAudience}`}
            {book.difficultyLevel && ` � Difficulty: ${book.difficultyLevel}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() =>
              setViewMode(viewMode === "single" ? "grid" : "single")
            }
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
          >
            {viewMode === "single" ? (
              <>
                <Grid3x3 size={16} />
                Grid View
              </>
            ) : (
              <>
                <List size={16} />
                Single View
              </>
            )}
          </button>
          {onPrint && (
            <button
              onClick={onPrint}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <Printer size={16} />
              Print
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <Download size={16} />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {book.puzzles.map((puzzle, index) => (
            <div
              key={puzzle.id}
              className="p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => {
                setCurrentPage(index);
                setViewMode("single");
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                  #{puzzle.displayNumber}
                </span>
                {puzzle.difficultyLabel && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] font-semibold rounded-full",
                      getDifficultyColor(puzzle.difficultyLabel),
                    )}
                  >
                    {puzzle.difficultyLabel}
                  </span>
                )}
              </div>
              <div className="flex justify-center">
                {renderGrid(
                  puzzle.grid.slice(0, 6).map((row) => row.slice(0, 6)),
                  puzzle.solution,
                )}
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                {puzzle.words.length} words
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Single View */}
      {viewMode === "single" && currentPuzzle && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {/* Page Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={goToPrevious}
                disabled={currentPage === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-medium text-gray-600">
                Puzzle {currentPuzzle.displayNumber} of {totalPages}
              </span>
              <button
                onClick={goToNext}
                disabled={currentPage === totalPages - 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {currentPuzzle.difficultyLabel && (
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs font-semibold rounded-full",
                    getDifficultyColor(currentPuzzle.difficultyLabel),
                  )}
                >
                  {currentPuzzle.difficultyLabel}
                  {currentPuzzle.difficultyScore !== undefined &&
                    ` (${currentPuzzle.difficultyScore})`}
                </span>
              )}
            </div>
          </div>

          {/* Puzzle Grid */}
          <div className="flex justify-center">
            {renderGrid(currentPuzzle.grid, currentPuzzle.solution)}
          </div>

          {/* Word List */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Words to Find
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {currentPuzzle.words.map((word) => (
                <span
                  key={word}
                  className="px-2 py-1 text-xs bg-gray-100 rounded-md text-gray-700"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>

          {/* Page Navigation (dots) */}
          <div className="flex justify-center gap-1 mt-4">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToPage(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentPage
                    ? "bg-blue-500"
                    : "bg-gray-300 hover:bg-gray-400",
                )}
                aria-label={`Go to puzzle ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

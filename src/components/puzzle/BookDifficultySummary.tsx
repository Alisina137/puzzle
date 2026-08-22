"use client";

import { cn } from "@/lib/utils";
import { DifficultyScore } from "./DifficultyScore";

interface BookDifficultySummaryProps {
  puzzles: Array<{
    id: string;
    difficultyScore: number | null;
    difficultyLabel: string | null;
    qualityMetrics: any;
  }>;
  targetDifficulty: string;
  className?: string;
}

export function BookDifficultySummary({
  puzzles,
  targetDifficulty,
  className,
}: BookDifficultySummaryProps) {
  // Filter out puzzles without difficulty data
  const validPuzzles = puzzles.filter(p => p.difficultyScore !== null && p.difficultyLabel !== null);
  
  if (validPuzzles.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        <p>No difficulty data available yet.</p>
        <p className="text-sm">Generate puzzles to see difficulty scores.</p>
      </div>
    );
  }

  const scores = validPuzzles.map(p => p.difficultyScore as number);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;

  // Count distribution
  const distribution = {
    Easy: validPuzzles.filter(p => p.difficultyLabel === "Easy").length,
    Medium: validPuzzles.filter(p => p.difficultyLabel === "Medium").length,
    Hard: validPuzzles.filter(p => p.difficultyLabel === "Hard").length,
    Expert: validPuzzles.filter(p => p.difficultyLabel === "Expert").length,
  };

  // Determine consistency
  const getConsistency = () => {
    if (range <= 10) return { label: "Excellent", color: "text-green-600" };
    if (range <= 20) return { label: "Good", color: "text-blue-600" };
    if (range <= 35) return { label: "Fair", color: "text-yellow-600" };
    return { label: "Needs Improvement", color: "text-red-600" };
  };

  const consistency = getConsistency();

  // Get label color for target difficulty
  const getTargetLabelColor = (label: string) => {
    switch (label) {
      case "Easy":
        return "text-green-700 bg-green-100";
      case "Medium":
        return "text-yellow-700 bg-yellow-100";
      case "Hard":
        return "text-orange-700 bg-orange-100";
      case "Expert":
        return "text-red-700 bg-red-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const getBarColor = (label: string) => {
    switch (label) {
      case "Easy":
        return "bg-green-500";
      case "Medium":
        return "bg-yellow-500";
      case "Hard":
        return "bg-orange-500";
      case "Expert":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const maxCount = Math.max(...Object.values(distribution));

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Book Difficulty Summary</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Target:</span>
          <span
            className={cn(
              "px-2 py-0.5 text-xs font-semibold rounded-full",
              getTargetLabelColor(targetDifficulty)
            )}
          >
            {targetDifficulty}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Avg Score</p>
          <p className="text-xl font-bold text-gray-900">{Math.round(avgScore)}/100</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Range</p>
          <p className="text-xl font-bold text-gray-900">{Math.round(range)}</p>
          <p className="text-xs text-gray-400">
            {Math.round(minScore)} - {Math.round(maxScore)}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Consistency</p>
          <p className={cn("text-xl font-bold", consistency.color)}>
            {consistency.label}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Puzzles</p>
          <p className="text-xl font-bold text-gray-900">
            {validPuzzles.length}
            <span className="text-sm font-normal text-gray-400 ml-1">/ {puzzles.length}</span>
          </p>
        </div>
      </div>

      {/* Distribution */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Difficulty Distribution
        </h4>
        <div className="space-y-2">
          {Object.entries(distribution).map(([label, count]) => (
            <div key={label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", getBarColor(label))}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Puzzle Scores */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Individual Puzzle Scores
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {validPuzzles.map((puzzle, index) => (
            <div
              key={puzzle.id}
              className="p-2 bg-gray-50 rounded-lg text-center"
            >
              <p className="text-xs text-gray-500">#{index + 1}</p>
              <p className="text-sm font-semibold text-gray-900">
                {puzzle.difficultyScore}
              </p>
              <p className={cn(
                "text-xs px-1.5 py-0.5 rounded-full inline-block",
                getTargetLabelColor(puzzle.difficultyLabel || "Unknown")
              )}>
                {puzzle.difficultyLabel}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

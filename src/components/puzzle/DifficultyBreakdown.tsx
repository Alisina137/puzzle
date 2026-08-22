"use client";

import { cn } from "@/lib/utils";

interface DifficultyBreakdownProps {
  score: number;
  label: "Easy" | "Medium" | "Hard" | "Expert";
  breakdown: {
    gridSizeScore: number;
    wordCountScore: number;
    wordLengthScore: number;
    directionsScore: number;
    reverseScore: number;
    overlapScore: number;
    vocabularyScore: number;
  };
  className?: string;
}

interface BreakdownItem {
  name: string;
  score: number;
  maxScore: number;
  color: string;
}

export function DifficultyBreakdown({
  score,
  label,
  breakdown,
  className,
}: DifficultyBreakdownProps) {
  const getColor = (score: number) => {
    if (score <= 25) return "bg-green-500";
    if (score <= 50) return "bg-yellow-500";
    if (score <= 75) return "bg-orange-500";
    return "bg-red-500";
  };

  const getLabelColor = (label: string) => {
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

  const items: BreakdownItem[] = [
    { name: "Grid Size", score: breakdown.gridSizeScore, maxScore: 100, color: "bg-blue-500" },
    { name: "Word Count", score: breakdown.wordCountScore, maxScore: 100, color: "bg-indigo-500" },
    { name: "Word Length", score: breakdown.wordLengthScore, maxScore: 100, color: "bg-purple-500" },
    { name: "Directions", score: breakdown.directionsScore, maxScore: 100, color: "bg-pink-500" },
    { name: "Reverse Words", score: breakdown.reverseScore, maxScore: 100, color: "bg-rose-500" },
    { name: "Word Overlap", score: breakdown.overlapScore, maxScore: 100, color: "bg-amber-500" },
    { name: "Vocabulary Level", score: breakdown.vocabularyScore, maxScore: 100, color: "bg-cyan-500" },
  ];

  // Sort items by score (highest first)
  const sortedItems = [...items].sort((a, b) => b.score - a.score);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Difficulty Score</span>
          <span
            className={cn(
              "px-2 py-0.5 text-xs font-semibold rounded-full",
              getLabelColor(label)
            )}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-gray-900">{score}</span>
          <span className="text-sm text-gray-500">/ 100</span>
        </div>
      </div>

      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColor(score))}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Factor Breakdown
        </h4>
        <div className="space-y-2.5">
          {sortedItems.map((item) => (
            <div key={item.name} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{item.name}</span>
                <span className="font-medium text-gray-900">{item.score}/100</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", item.color)}
                  style={{ width: `${Math.min(item.score, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-400">
        <span className="font-medium">Note:</span> Higher scores indicate more difficult puzzles.
        Factors are scored relative to the maximum possible difficulty.
      </div>
    </div>
  );
}

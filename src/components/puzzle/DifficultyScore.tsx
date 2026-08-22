"use client";

import { cn } from "@/lib/utils";

interface DifficultyScoreProps {
  score: number;
  label: "Easy" | "Medium" | "Hard" | "Expert";
  showBreakdown?: boolean;
  breakdown?: {
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

export function DifficultyScore({
  score,
  label,
  showBreakdown = false,
  breakdown,
  className,
}: DifficultyScoreProps) {
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

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Difficulty</span>
          <span
            className={cn(
              "px-2 py-0.5 text-xs font-semibold rounded-full",
              getLabelColor(label)
            )}
          >
            {label}
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-900">{score}/100</span>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColor(score))}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>

      {showBreakdown && breakdown && (
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Grid Size</span>
            <span className="font-medium text-gray-900">{breakdown.gridSizeScore}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Word Count</span>
            <span className="font-medium text-gray-900">{breakdown.wordCountScore}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Word Length</span>
            <span className="font-medium text-gray-900">{breakdown.wordLengthScore}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Directions</span>
            <span className="font-medium text-gray-900">{breakdown.directionsScore}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Reverse Words</span>
            <span className="font-medium text-gray-900">{breakdown.reverseScore}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Word Overlap</span>
            <span className="font-medium text-gray-900">{breakdown.overlapScore}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Vocabulary Level</span>
            <span className="font-medium text-gray-900">{breakdown.vocabularyScore}/100</span>
          </div>
        </div>
      )}
    </div>
  );
}

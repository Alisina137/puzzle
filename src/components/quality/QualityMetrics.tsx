"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";

interface QualityMetricsProps {
  metrics: {
    totalPuzzles: number;
    validPuzzles: number;
    verifiedSolutions: number;
    duplicates: number;
    difficultyConsistency: number;
    score: number;
  };
  className?: string;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  status?: "success" | "warning" | "error" | "info";
  subtext?: string;
}

function MetricCard({ label, value, icon, status = "info", subtext }: MetricCardProps) {
  const statusColors = {
    success: "bg-green-50 border-green-200 text-green-700",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
    error: "bg-red-50 border-red-200 text-red-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  };

  const statusIconColors = {
    success: "text-green-500",
    warning: "text-yellow-500",
    error: "text-red-500",
    info: "text-blue-500",
  };

  return (
    <div className={cn("p-4 rounded-xl border", statusColors[status])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={cn("p-2 rounded-lg bg-white/50", statusIconColors[status])}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function QualityMetrics({
  metrics,
  className,
}: QualityMetricsProps) {
  const {
    totalPuzzles,
    validPuzzles,
    verifiedSolutions,
    duplicates,
    difficultyConsistency,
    score,
  } = metrics;

  const invalidPuzzles = totalPuzzles - validPuzzles;
  const validationRate = totalPuzzles > 0 ? Math.round((validPuzzles / totalPuzzles) * 100) : 0;
  const solutionRate = totalPuzzles > 0 ? Math.round((verifiedSolutions / totalPuzzles) * 100) : 0;

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-lg font-semibold text-gray-900">Quality Metrics</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Valid Puzzles */}
        <MetricCard
          label="Valid Puzzles"
          value={`${validPuzzles}/${totalPuzzles}`}
          icon={<CheckCircle size={20} />}
          status={validationRate >= 80 ? "success" : validationRate >= 60 ? "warning" : "error"}
          subtext={`${validationRate}% validation rate`}
        />

        {/* Solutions Verified */}
        <MetricCard
          label="Solutions Verified"
          value={`${verifiedSolutions}/${totalPuzzles}`}
          icon={<CheckCircle size={20} />}
          status={solutionRate >= 80 ? "success" : solutionRate >= 60 ? "warning" : "error"}
          subtext={`${solutionRate}% verified`}
        />

        {/* Duplicates */}
        <MetricCard
          label="Duplicates"
          value={duplicates}
          icon={<AlertTriangle size={20} />}
          status={duplicates === 0 ? "success" : "warning"}
          subtext={duplicates === 0 ? "No duplicates" : `${duplicates} duplicate(s) found`}
        />

        {/* Difficulty Consistency */}
        <MetricCard
          label="Difficulty Consistency"
          value={`${Math.round(difficultyConsistency)}%`}
          icon={<TrendingUp size={20} />}
          status={difficultyConsistency >= 70 ? "success" : difficultyConsistency >= 50 ? "warning" : "error"}
          subtext={difficultyConsistency >= 70 ? "Good consistency" : "Needs improvement"}
        />
      </div>

      {/* Summary Bar */}
      <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Overall Quality</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {validationRate}% valid · {solutionRate}% solutions
            </span>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-sm font-semibold",
                score >= 80 ? "bg-green-100 text-green-700" :
                score >= 60 ? "bg-yellow-100 text-yellow-700" :
                score >= 40 ? "bg-orange-100 text-orange-700" :
                "bg-red-100 text-red-700"
              )}
            >
              Score: {Math.round(score)}/100
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              score >= 80 ? "bg-green-500" :
              score >= 60 ? "bg-yellow-500" :
              score >= 40 ? "bg-orange-500" :
              "bg-red-500"
            )}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

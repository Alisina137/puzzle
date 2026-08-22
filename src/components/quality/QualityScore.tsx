"use client";

import { cn } from "@/lib/utils";

interface QualityScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function QualityScore({
  score,
  size = "md",
  showLabel = true,
  className,
}: QualityScoreProps) {
  const getColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getBackgroundColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  const getLabelColor = (score: number) => {
    if (score >= 80) return "text-green-700 bg-green-100";
    if (score >= 60) return "text-yellow-700 bg-yellow-100";
    if (score >= 40) return "text-orange-700 bg-orange-100";
    return "text-red-700 bg-red-100";
  };

  const sizeClasses = {
    sm: {
      container: "w-16 h-16",
      text: "text-xl",
      label: "text-xs",
    },
    md: {
      container: "w-24 h-24",
      text: "text-3xl",
      label: "text-sm",
    },
    lg: {
      container: "w-32 h-32",
      text: "text-5xl",
      label: "text-base",
    },
  };

  const clampedScore = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative">
        <svg
          className={cn("transform -rotate-90", sizeClasses[size].container)}
          viewBox="0 0 120 120"
        >
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          {/* Score circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke={getBackgroundColor(clampedScore)}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center",
            getColor(clampedScore)
          )}
        >
          <span className={cn("font-bold", sizeClasses[size].text)}>
            {Math.round(clampedScore)}
          </span>
          {size !== "sm" && (
            <span className="text-gray-400 text-[10px] font-medium">/100</span>
          )}
        </div>
      </div>

      {showLabel && (
        <div className="mt-2 text-center">
          <span
            className={cn(
              "px-2 py-1 rounded-full font-semibold",
              sizeClasses[size].label,
              getLabelColor(clampedScore)
            )}
          >
            {getLabel(clampedScore)}
          </span>
        </div>
      )}
    </div>
  );
}

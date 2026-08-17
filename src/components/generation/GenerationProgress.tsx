"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

interface ProgressData {
  bookId: string;
  status: "pending" | "generating" | "ready" | "failed";
  progress: number;
  generated: number;
  total: number;
  failedPuzzles: number;
  jobId?: string;
  error?: string;
  qualityScore?: number;
}

interface GenerationProgressProps {
  bookId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function GenerationProgress({
  bookId,
  onComplete,
  onError,
}: GenerationProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isMounted = true;

    async function fetchProgress() {
      try {
        const url = "/api/books/" + bookId + "/progress";
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch progress");
        }

        const result = await response.json();
        const data = result.data as ProgressData;

        if (isMounted) {
          setProgress(data);
          setLoading(false);
          setError(null);

          if (data.status === "ready") {
            onComplete?.();
          } else if (data.status === "failed") {
            onError?.(data.error || "Generation failed");
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : "Failed to fetch progress";

          setError(message);
          setLoading(false);
        }
      }
    }

    // Initial fetch
    fetchProgress();

    // Poll every 2 seconds
    interval = setInterval(fetchProgress, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [bookId, onComplete, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />

        <p className="text-red-700">{error}</p>

        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case "pending":
        return <Clock size={20} className="text-gray-400" />;

      case "generating":
        return <Loader2 size={20} className="animate-spin text-blue-600" />;

      case "ready":
        return <CheckCircle size={20} className="text-green-500" />;

      case "failed":
        return <XCircle size={20} className="text-red-500" />;

      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case "pending":
        return "text-gray-500";

      case "generating":
        return "text-blue-600";

      case "ready":
        return "text-green-600";

      case "failed":
        return "text-red-600";

      default:
        return "text-gray-500";
    }
  };

  const getProgressColor = () => {
    if (progress.status === "failed") {
      return "bg-red-500";
    }

    if (progress.status === "ready") {
      return "bg-green-500";
    }

    return "bg-blue-600";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Status Header */}
      <div className="flex items-center gap-3 mb-4">
        {getStatusIcon()}

        <span className={"font-medium " + getStatusColor()}>
          {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
        </span>

        <span className="text-sm text-gray-400 ml-auto">
          {progress.generated}/{progress.total} puzzles
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div
          className={
            "h-2.5 rounded-full transition-all duration-500 " +
            getProgressColor()
          }
          style={{
            width: `${Math.min(Math.max(progress.progress, 0), 100)}%`,
          }}
        />
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <p className="font-semibold text-gray-800">{progress.progress}%</p>
          <p className="text-gray-400 text-xs">Complete</p>
        </div>

        <div className="text-center">
          <p className="font-semibold text-gray-800">{progress.generated}</p>
          <p className="text-gray-400 text-xs">Generated</p>
        </div>

        <div className="text-center">
          <p className="font-semibold text-gray-800">
            {progress.failedPuzzles || 0}
          </p>
          <p className="text-gray-400 text-xs">Failed</p>
        </div>
      </div>

      {/* Quality Score */}
      {progress.qualityScore !== undefined && progress.status === "ready" && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-sm text-green-700">
            Quality Score: {progress.qualityScore}/100
          </p>
        </div>
      )}

      {/* Error Message */}
      {progress.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{progress.error}</p>
        </div>
      )}
    </div>
  );
}

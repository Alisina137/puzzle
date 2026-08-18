"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface PreflightCheck {
  name: string;
  passed: boolean;
  message?: string;
  details?: string;
  severity: "error" | "warning" | "info";
}

interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
  errors: PreflightCheck[];
  warnings: PreflightCheck[];
  infos: PreflightCheck[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningsCount: number;
  };
}

interface PreflightButtonProps {
  bookId: string;
  onExport?: () => void;
}

export function PreflightButton({ bookId, onExport }: PreflightButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!showResults) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowResults(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showResults]);

  const runPreflight = async () => {
    const toastId = toast.loading("Running preflight checks...");

    setIsRunning(true);
    setResult(null);

    try {
      const response = await fetch("/api/books/" + bookId + "/preflight", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to run preflight");
      }

      const data = await response.json();
      setResult(data.data);
      setShowResults(true);

      toast.dismiss(toastId);
      if (data.data.passed) {
        toast.success("Preflight checks passed! ✅");
      } else {
        toast.warning("Preflight checks found issues ⚠️");
      }
    } catch (error: any) {
      console.error("Preflight error:", error);
      toast.dismiss(toastId);
      toast.error(error.message || "Failed to run preflight checks");
    } finally {
      setIsRunning(false);
    }
  };

  const closeResults = () => {
    setShowResults(false);
  };

  const handleExport = () => {
    if (!onExport) {
      return;
    }

    closeResults();
    onExport();
  };

  const getStatusIcon = (check: PreflightCheck) => {
    if (check.passed) {
      return (
        <CheckCircle
          size={16}
          className="text-green-500 flex-shrink-0 mt-0.5"
        />
      );
    }

    if (check.severity === "error") {
      return (
        <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
      );
    }

    if (check.severity === "warning") {
      return (
        <AlertCircle
          size={16}
          className="text-yellow-500 flex-shrink-0 mt-0.5"
        />
      );
    }

    return <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />;
  };

  const getStatusColor = (check: PreflightCheck) => {
    if (check.passed) {
      return "border-green-200 bg-green-50";
    }

    if (check.severity === "error") {
      return "border-red-200 bg-red-50";
    }

    if (check.severity === "warning") {
      return "border-yellow-200 bg-yellow-50";
    }

    return "border-blue-200 bg-blue-50";
  };

  return (
    <div>
      <button
        type="button"
        onClick={runPreflight}
        disabled={isRunning}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRunning ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <AlertCircle size={18} />
            Preflight Check
          </>
        )}
      </button>

      {showResults && result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preflight-results-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeResults();
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3
                  id="preflight-results-title"
                  className="text-lg font-semibold text-gray-800"
                >
                  Preflight Results
                </h3>

                <p className="text-sm text-gray-500">KDP readiness check</p>
              </div>

              <button
                type="button"
                onClick={closeResults}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close preflight results"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span
                    className={
                      "px-3 py-1 text-sm rounded-full " +
                      (result.passed
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700")
                    }
                  >
                    {result.passed ? "PASSED" : "FAILED"}
                  </span>

                  <span className="text-sm text-gray-500">
                    {result.summary.passedChecks}/{result.summary.totalChecks}{" "}
                    passed
                  </span>
                </div>

                <div className="flex gap-3 text-sm">
                  {result.summary.failedChecks > 0 && (
                    <span className="text-red-500">
                      {result.summary.failedChecks} errors
                    </span>
                  )}

                  {result.summary.warningsCount > 0 && (
                    <span className="text-yellow-500">
                      {result.summary.warningsCount} warnings
                    </span>
                  )}
                </div>
              </div>

              {/* Checks */}
              <div className="space-y-2">
                {result.checks.length > 0 ? (
                  result.checks.map((check, index) => (
                    <div
                      key={check.name + "-" + index}
                      className={
                        "flex items-start gap-3 p-3 rounded-lg border " +
                        getStatusColor(check)
                      }
                    >
                      {getStatusIcon(check)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-800">
                            {check.name}
                          </span>

                          <span
                            className={
                              "text-xs px-2 py-0.5 rounded " +
                              (check.passed
                                ? "bg-green-100 text-green-700"
                                : check.severity === "warning"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700")
                            }
                          >
                            {check.passed
                              ? "Passed"
                              : check.severity === "warning"
                                ? "Warning"
                                : "Failed"}
                          </span>
                        </div>

                        {check.message && (
                          <p className="text-sm text-gray-600 mt-1">
                            {check.message}
                          </p>
                        )}

                        {check.details && (
                          <p className="text-xs text-gray-400 mt-1">
                            {check.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No preflight checks were returned.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={closeResults}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>

              {result.passed && onExport && (
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isRunning}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

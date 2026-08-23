"use client";

import { useState } from "react";
import { Loader2, CheckCircle, XCircle, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface PreflightCheck {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  message?: string;
  details?: any;
}

interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
  errors: string[];
  warnings: string[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

interface PreflightButtonProps {
  bookId: string;
  onComplete?: (result: PreflightResult) => void;
  className?: string;
}

export function PreflightButton({ bookId, onComplete, className }: PreflightButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const runPreflight = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/books/${bookId}/kdp/preflight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setIsOpen(true);
        onComplete?.(data.data);
        toast.success("Preflight check completed");
      } else {
        toast.error(data.error || "Failed to run preflight");
      }
    } catch (error) {
      console.error("Error running preflight:", error);
      toast.error("Failed to run preflight");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error": return <XCircle size={16} className="text-red-500" />;
      case "warning": return <AlertTriangle size={16} className="text-yellow-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />;
  };

  return (
    <>
      <button
        onClick={runPreflight}
        disabled={loading}
        className={`flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 ${className || ""}`}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <RefreshCw size={18} />
        )}
        {loading ? "Checking..." : "KDP Preflight"}
      </button>

      {/* Results Modal */}
      {isOpen && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">KDP Preflight Results</h2>
                <p className="text-sm text-gray-500">
                  {result.passed ? "✅ All checks passed!" : "⚠️ Some issues found"}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            {/* Summary */}
            <div className="mb-4 grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-xl font-bold text-gray-800">{result.summary.total}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-xl font-bold text-green-600">{result.summary.passed}</p>
                <p className="text-xs text-green-600">Passed</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-xl font-bold text-red-600">{result.summary.failed}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-3 text-center">
                <p className="text-xl font-bold text-yellow-600">{result.summary.warnings}</p>
                <p className="text-xs text-yellow-600">Warnings</p>
              </div>
            </div>

            {/* Checks List */}
            <div className="space-y-2">
              {result.checks.map((check) => (
                <div
                  key={check.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    check.passed
                      ? "border-green-200 bg-green-50"
                      : check.severity === "error"
                      ? "border-red-200 bg-red-50"
                      : "border-yellow-200 bg-yellow-50"
                  }`}
                >
                  <div className="mt-0.5">{getStatusIcon(check.passed)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{check.name}</span>
                      {!check.passed && (
                        <span className="text-xs font-medium text-gray-500">
                          ({check.severity})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{check.description}</p>
                    {check.message && (
                      <p className={`mt-1 text-sm ${check.passed ? "text-green-600" : check.severity === "error" ? "text-red-600" : "text-yellow-600"}`}>
                        {check.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Errors & Warnings */}
            {result.errors.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <h4 className="font-semibold text-red-700">Errors</h4>
                <ul className="mt-1 list-disc pl-5 text-sm text-red-600">
                  {result.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <h4 className="font-semibold text-yellow-700">Warnings</h4>
                <ul className="mt-1 list-disc pl-5 text-sm text-yellow-600">
                  {result.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 border-t border-gray-200 pt-4 text-center">
              <p className="text-sm text-gray-500">
                {result.passed
                  ? "✅ Your book is ready for KDP export!"
                  : "Please fix the issues above before exporting to KDP."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

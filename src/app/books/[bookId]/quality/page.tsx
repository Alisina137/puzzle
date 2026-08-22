"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { QualityScore, QualityMetrics } from "@/components/quality";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, ArrowLeft, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface QualityReport {
  id: string;
  bookId: string;
  score: number;
  totalPuzzles: number;
  validPuzzles: number;
  verifiedSolutions: number;
  duplicates: number;
  difficultyConsistency: number;
  warnings: string[];
  recommendations: string[];
  generatedAt: string;
}

interface Recommendation {
  id: string;
  type: "regenerate" | "adjust" | "review" | "info";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  action: string;
  puzzleId?: string;
}

interface RecommendationsResponse {
  bookId: string;
  recommendations: Recommendation[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}

export default function QualityDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQualityData = async () => {
    try {
      setLoading(true);
      
      // Fetch quality report
      const reportRes = await fetch(`/api/books/${bookId}/quality`);
      const reportData = await reportRes.json();
      
      if (reportData.success) {
        setReport(reportData.data);
      } else {
        // Try to generate a report
        const generateRes = await fetch(`/api/books/${bookId}/quality`, {
          method: "POST",
        });
        const generateData = await generateRes.json();
        if (generateData.success) {
          setReport(generateData.data);
        }
      }

      // Fetch recommendations
      const recRes = await fetch(`/api/books/${bookId}/recommendations`);
      const recData = await recRes.json();
      if (recData.success) {
        setRecommendations(recData.data);
      }
    } catch (error) {
      console.error("Error fetching quality data:", error);
      toast.error("Failed to load quality data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQualityData();
    setRefreshing(false);
    toast.success("Quality data refreshed");
  };

  const handleApplyFix = async (recommendationId: string, puzzleId?: string) => {
    setApplying(recommendationId);
    try {
      const res = await fetch(`/api/books/${bookId}/recommendations/${recommendationId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzleId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.data?.message || "Fix applied successfully");
        // Refresh data
        await fetchQualityData();
      } else {
        toast.error(data.error || "Failed to apply fix");
      }
    } catch (error) {
      console.error("Error applying fix:", error);
      toast.error("Failed to apply fix");
    } finally {
      setApplying(null);
    }
  };

  const handleApplyAll = async () => {
    setApplying("all");
    try {
      const res = await fetch(`/api/books/${bookId}/fix-all`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.data?.message || "All fixes applied");
        await fetchQualityData();
      } else {
        toast.error(data.error || "Failed to apply fixes");
      }
    } catch (error) {
      console.error("Error applying all fixes:", error);
      toast.error("Failed to apply fixes");
    } finally {
      setApplying(null);
    }
  };

  useEffect(() => {
    if (bookId) {
      fetchQualityData();
    }
  }, [bookId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "info":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle size={18} className="text-red-500" />;
      case "warning":
        return <AlertTriangle size={18} className="text-yellow-500" />;
      case "info":
        return <CheckCircle size={18} className="text-blue-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin text-blue-500" />
            <p className="text-gray-500">Loading quality report...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-700">No Quality Report Available</h2>
            <p className="text-gray-500 mt-2">Generate puzzles first, then check quality.</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => router.push(`/books/${bookId}`)}
            >
              Back to Book
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const hasCriticalIssues = recommendations?.summary.critical && recommendations.summary.critical > 0;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
              onClick={() => router.push(`/books/${bookId}`)}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Quality Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1 disabled:opacity-50"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            {hasCriticalIssues && (
              <button
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                onClick={handleApplyAll}
                disabled={applying === "all"}
              >
                {applying === "all" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Fix All Critical Issues"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Quality Score */}
        <div className="flex items-center justify-center py-6 bg-white rounded-xl border border-gray-200">
          <QualityScore score={report.score} size="lg" />
        </div>

        {/* Quality Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <QualityMetrics
            metrics={{
              totalPuzzles: report.totalPuzzles,
              validPuzzles: report.validPuzzles,
              verifiedSolutions: report.verifiedSolutions,
              duplicates: report.duplicates,
              difficultyConsistency: report.difficultyConsistency,
              score: report.score,
            }}
          />
        </div>

        {/* Warnings */}
        {report.warnings && report.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
              <AlertTriangle size={18} />
              Warnings
            </h3>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              {report.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.recommendations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
              <div className="flex gap-3 text-sm">
                <span className="text-red-600">Critical: {recommendations.summary.critical}</span>
                <span className="text-yellow-600">Warning: {recommendations.summary.warning}</span>
                <span className="text-blue-600">Info: {recommendations.summary.info}</span>
              </div>
            </div>

            <div className="space-y-3">
              {recommendations.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    getSeverityColor(rec.severity)
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(rec.severity)}
                      <div>
                        <h4 className="font-semibold text-gray-800">{rec.title}</h4>
                        <p className="text-sm text-gray-600 mt-0.5">{rec.description}</p>
                        {rec.puzzleId && (
                          <p className="text-xs text-gray-400 mt-1">
                            Puzzle ID: {rec.puzzleId}
                          </p>
                        )}
                      </div>
                    </div>
                    {rec.severity !== "info" && (
                      <button
                        className={cn(
                          "px-3 py-1 text-sm rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 ml-4",
                          rec.severity === "critical"
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "border border-gray-300 hover:bg-gray-50"
                        )}
                        onClick={() => handleApplyFix(rec.id, rec.puzzleId)}
                        disabled={applying === rec.id}
                      >
                        {applying === rec.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          rec.action
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Metadata */}
        <div className="text-xs text-gray-400 text-right">
          Generated: {new Date(report.generatedAt).toLocaleString()}
        </div>
      </div>
    </DashboardLayout>
  );
}
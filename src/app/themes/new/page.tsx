"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Palette, Sparkles, CheckCircle, XCircle, PlusCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DomainResult {
  domainName: string;
  fileName: string;
  success: boolean;
  error?: string;
  wordCount: number;
}

interface PipelineProgress {
  stage: string;
  theme: string;
  totalDomains: number;
  processedDomains: number;
  currentDomain?: string;
  currentDomainIndex?: number;
  successfulDomains: number;
  failedDomains: string[];
  domainResults: DomainResult[];
  message: string;
}

export default function CreateThemePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [themeName, setThemeName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [result, setResult] = useState<PipelineProgress | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  // Check if AI is configured
  useEffect(() => {
    fetch("/api/themes/test-ai")
      .then((res) => res.json())
      .then((data) => setAiConfigured(data.configured ?? false))
      .catch(() => setAiConfigured(false));
  }, []);

  const handleGenerate = async () => {
    if (!themeName.trim()) {
      toast.error("Please enter a theme name");
      return;
    }

    setIsGenerating(true);
    setProgress(null);
    setResult(null);

    const toastId = toast.loading(`Generating vocabulary for "${themeName}"...`);

    try {
      const response = await fetch(
        `/api/themes/${encodeURIComponent(themeName.trim())}/generate-vocabulary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        toast.dismiss(toastId);
        toast.error(data.error || "Failed to generate vocabulary");
        setIsGenerating(false);
        return;
      }

      toast.dismiss(toastId);
      setResult(data.data);
      toast.success(
        `Theme "${themeName}" created with ${data.data.successfulDomains} domains!`,
      );
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const stageLabel = (stage: string) => {
    switch (stage) {
      case "discovering":
        return "Discovering domains...";
      case "generating":
        return "Generating vocabulary...";
      case "cleaning":
        return "Cleaning & classifying...";
      case "complete":
        return "Complete!";
      case "error":
        return "Error";
      default:
        return stage;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Palette size={24} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Create New Theme</h1>
            <p className="text-gray-500 text-sm">
              Generate a themed vocabulary with AI-powered domain discovery
            </p>
          </div>
        </div>

        {aiConfigured === false && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
            <strong>AI service is not configured.</strong> Set the{" "}
            <code className="px-1 py-0.5 bg-amber-100 rounded">
              OPENAI_API_KEY
            </code>{" "}
            environment variable to enable vocabulary generation.
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* Theme Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Theme Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., Sports, Cooking, Music, History..."
              disabled={isGenerating}
            />
            <p className="text-gray-400 text-xs mt-1">
              The AI will discover sub-domains and generate vocabulary for each.
            </p>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !themeName.trim()}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Theme Vocabulary
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={20} className="text-green-500" />
              <h2 className="text-lg font-semibold text-gray-800">
                Generation Results
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">
                  {result.successfulDomains}
                </p>
                <p className="text-xs text-green-600">Successful</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-700">
                  {result.failedDomains.length}
                </p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {result.domainResults.reduce(
                    (sum, d) => sum + d.wordCount,
                    0,
                  )}
                </p>
                <p className="text-xs text-blue-600">Total Words</p>
              </div>
            </div>

            {/* Domain Results */}
            <div className="space-y-2">
              {result.domainResults.map((domain, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    domain.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {domain.success ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <XCircle size={16} className="text-red-500" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {domain.domainName}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {domain.success
                      ? `${domain.wordCount} words`
                      : domain.error || "Failed"}
                  </span>
                </div>
              ))}
            </div>

            {/* Next Steps */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => router.push("/books/new")}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <PlusCircle size={18} />
                Create Book with This Theme
              </button>
              <button
                onClick={() => {
                  setThemeName("");
                  setResult(null);
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Create Another
              </button>
            </div>
          </div>
        )}

        {/* Info Section */}
        {!result && !isGenerating && (
          <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-800 mb-1">
              How it works
            </h3>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>🔍 AI discovers 30-50 sub-domains for your theme</li>
              <li>📝 Vocabulary is generated independently for each domain</li>
              <li>
                ✨ Words are cleaned, deduplicated, and classified by difficulty
              </li>
              <li>📚 The theme becomes available in the Create Book page</li>
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useState } from "react";
import { Loader2, FileText, File, Download } from "lucide-react";
import { toast } from "sonner";

interface SolutionsExportProps {
  bookId: string;
  className?: string;
}

export function SolutionsExport({ bookId, className }: SolutionsExportProps) {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<"pdf" | "txt">("pdf");
  const [includeWordList, setIncludeWordList] = useState(true);
  const [includeCoordinates, setIncludeCoordinates] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/books/${bookId}/export/solutions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format,
          includeWordList,
          includeCoordinates,
        }),
      });

      if (!response.ok) {
        let message = "Failed to export solutions";
        try {
          const error = await response.json();
          message = error?.error || message;
        } catch {
          // Ignore invalid JSON error response.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `solutions.${format === "pdf" ? "pdf" : "txt"}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success(`Solutions exported as ${format.toUpperCase()}! 📄`);
      setIsOpen(false);
    } catch (error: unknown) {
      console.error("Solutions export error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export solutions",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
      >
        <FileText size={18} />
        Export Solutions
      </button>

      {isOpen && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <h3 className="mb-3 font-medium text-gray-800">Export Solutions</h3>

          {/* Format */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Format
            </label>
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => setFormat("pdf")}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                  format === "pdf"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                PDF
              </button>
              <button
                onClick={() => setFormat("txt")}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                  format === "txt"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                TXT
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="mb-3 space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeWordList}
                onChange={(e) => setIncludeWordList(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Include word list
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeCoordinates}
                onChange={(e) => setIncludeCoordinates(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Include coordinates (start → end)
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {loading ? "Exporting..." : "Export"}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

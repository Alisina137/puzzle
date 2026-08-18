"use client";

import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  Trash2,
  FileText,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { SortablePuzzleList } from "@/components/puzzle/SortablePuzzleList";
import { PreflightButton } from "@/components/pdf/PreflightButton";
import { ExportsList } from "@/components/export/ExportsList";
import { toast } from "sonner";

interface BookPuzzle {
  id: string;
  position: number;
  displayNumber: number;
  puzzle: {
    id: string;
    type: string;
    difficulty: string;
    qualityScore: number | null;
    data: {
      grid: string[][];
      words: string[];
    };
  };
  puzzleVersion: {
    id: string;
    versionNumber: number;
    data?: unknown;
  };
  solution: {
    id: string;
    data: unknown;
  } | null;
}

interface Book {
  id: string;
  title: string;
  theme: string;
  puzzleCount: number;
  status: string;
  qualityScore: number | null;
  createdAt: string;
  bookPuzzles: BookPuzzle[];
}

interface Book {
  id: string;
  title: string;
  theme: string;
  puzzleCount: number;
  status: string;
  qualityScore: number | null;
  createdAt: string;
  bookPuzzles: BookPuzzle[];
}

export default function BookPage() {
  const params = useParams<{ bookId: string }>();
  const router = useRouter();

  const bookId = params.bookId;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!bookId) {
      setError("No book ID provided");
      setLoading(false);
      return;
    }

    async function fetchBook() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/books/${bookId}`);

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (response.status === 404) {
          setError("Book not found");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch book");
        }

        const result = await response.json();

        if (!result?.data) {
          throw new Error("Invalid book response");
        }

        setBook(result.data);
        setError(null);
      } catch (err: unknown) {
        console.error("Error fetching book:", err);

        setError(err instanceof Error ? err.message : "Failed to load book");
      } finally {
        setLoading(false);
      }
    }

    fetchBook();
  }, [bookId, refreshKey]);

  const handleExport = async () => {
    if (!book || isExporting) {
      return;
    }

    const toastId = toast.loading("Generating PDF...");

    setIsExporting(true);

    try {
      const response = await fetch(`/api/books/${bookId}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageSize: "A4",
          includeSolutions: true,
          solutionPlacement: "back",
        }),
      });

      if (!response.ok) {
        let message = "Failed to export";

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
      link.download = `${book.title.replace(/\s+/g, "_")}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success("PDF exported successfully! 📄");
    } catch (error: unknown) {
      console.error("Export error:", error);

      toast.dismiss(toastId);

      toast.error(
        error instanceof Error ? error.message : "Failed to export PDF",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!book || isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${book.title}"? This will permanently remove all puzzles and cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    const toastId = toast.loading("Deleting book...");

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete book");
      }

      toast.dismiss(toastId);
      toast.success("Book deleted successfully! 🗑️");

      router.push("/books");
    } catch (error: unknown) {
      console.error("Error deleting book:", error);

      toast.dismiss(toastId);
      toast.error("Failed to delete book. Please try again.");

      setIsDeleting(false);
    }
  };

  const handleGenerationComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleGenerationError = (error: string) => {
    console.error("Generation error:", error);
    setRefreshKey((prev) => prev + 1);
  };

  const handleReorder = async (puzzleIds: string[]) => {
    try {
      const response = await fetch(`/api/books/${bookId}/puzzles/reorder`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: puzzleIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reorder puzzles");
      }

      setRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      console.error("Reorder error:", error);
      throw error;
    }
  };

  const handlePuzzleUpdate = (updatedPuzzle: BookPuzzle) => {
    setBook((prevBook) => {
      if (!prevBook) {
        return prevBook;
      }

      return {
        ...prevBook,
        bookPuzzles: prevBook.bookPuzzles.map((bookPuzzle) =>
          bookPuzzle.id === updatedPuzzle.id ? updatedPuzzle : bookPuzzle,
        ),
      };
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-gray-100 text-gray-600",
      generating: "bg-yellow-100 text-yellow-700",
      ready: "bg-green-100 text-green-700",
      exporting: "bg-purple-100 text-purple-700",
      exported: "bg-blue-100 text-blue-700",
      failed: "bg-red-100 text-red-700",
    };

    return styles[status] || "bg-gray-100 text-gray-600";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !book) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <p className="text-red-500">{error || "Book not found"}</p>

          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>

          <Link
            href="/books"
            className="ml-4 mt-2 inline-block text-blue-600 hover:underline"
          >
            ← Back to Books
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/books"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={18} />
            Back to Books
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {book.status === "ready" && (
              <>
                <Link
                  href={`/books/${bookId}/preview`}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
                >
                  <Eye size={18} />
                  Preview
                </Link>

                <PreflightButton bookId={bookId} onExport={handleExport} />

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText size={18} />
                      Export PDF
                    </>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleDeleteBook}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{book.title}</h1>

              <p className="text-gray-500">Theme: {book.theme}</p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-sm ${getStatusBadge(
                  book.status,
                )}`}
              >
                {book.status}
              </span>

              <button
                type="button"
                onClick={() => setRefreshKey((prev) => prev + 1)}
                className="p-2 text-gray-400 transition-colors hover:text-gray-600"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {book.puzzleCount}
              </p>
              <p className="text-sm text-gray-500">Total Puzzles</p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {book.bookPuzzles.length}
              </p>
              <p className="text-sm text-gray-500">Generated</p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {book.qualityScore ?? "N/A"}
              </p>
              <p className="text-sm text-gray-500">Quality Score</p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">Created</p>

              <p className="text-sm font-medium text-gray-700">
                {new Date(book.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {(book.status === "pending" ||
          book.status === "generating" ||
          book.status === "failed") && (
          <GenerationProgress
            bookId={book.id}
            onComplete={handleGenerationComplete}
            onError={handleGenerationError}
          />
        )}

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Puzzles</h2>

            <span className="text-sm text-gray-400">
              {book.bookPuzzles.length} of {book.puzzleCount} generated
            </span>
          </div>

          <SortablePuzzleList
            puzzles={book.bookPuzzles}
            bookId={book.id}
            onReorder={handleReorder}
            onPuzzleUpdate={handlePuzzleUpdate}
          />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Exports</h2>

          <ExportsList bookId={book.id} />
        </div>
      </div>
    </DashboardLayout>
  );
}

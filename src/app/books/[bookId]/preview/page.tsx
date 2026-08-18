"use client";

import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface Book {
  id: string;
  title: string;
  theme: string;
  puzzleCount: number;
  status: string;
  qualityScore: number | null;
  createdAt: string;
  bookPuzzles: any[];
}

interface PreviewPage {
  type: "puzzle" | "solution";
  number: number;
  data: any;
}

export default function BookPreviewPage() {
  const params = useParams();
  const bookId = params?.bookId as string;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showSolutions, setShowSolutions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pages, setPages] = useState<PreviewPage[]>([]);

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

        const response = await fetch("/api/books/" + bookId);

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
        const bookData = result.data as Book;

        setBook(bookData);

        const puzzlePages: PreviewPage[] = bookData.bookPuzzles.map(
          (bp: any, index: number) => ({
            type: "puzzle",
            number: index + 1,
            data: bp,
          }),
        );

        const solutionPages: PreviewPage[] = bookData.bookPuzzles.map(
          (bp: any, index: number) => ({
            type: "solution",
            number: index + 1,
            data: bp,
          }),
        );

        let allPages = puzzlePages;

        if (showSolutions) {
          allPages = [];

          for (let i = 0; i < puzzlePages.length; i++) {
            allPages.push(puzzlePages[i]);
            allPages.push(solutionPages[i]);
          }
        }

        setPages(allPages);

        // Make sure the current page still exists after changing
        // the number of preview pages.
        setCurrentPage((previousPage) =>
          Math.min(previousPage, Math.max(0, allPages.length - 1)),
        );
      } catch (err: any) {
        console.error("Error fetching book:", err);
        setError(err.message || "Failed to load book");
      } finally {
        setLoading(false);
      }
    }

    fetchBook();
  }, [bookId, showSolutions]);

  const handleExport = async () => {
    if (!book || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch("/api/books/" + bookId + "/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageSize: "A4",
          includeSolutions: showSolutions,
          solutionPlacement: showSolutions ? "after" : "back",
        }),
      });

      if (!response.ok) {
        let message = "Failed to export";

        try {
          const error = await response.json();
          message = error.error || message;
        } catch {
          // Keep default error message if response isn't JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = book.title.replace(/[<>:"/\\\\|?*]+/g, "_") + ".pdf";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Export error:", error);
      alert(error.message || "Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = pages.length;

  const currentPageData = pages[currentPage] || null;

  const goToPreviousPage = () => {
    setCurrentPage((previousPage) => Math.max(0, previousPage - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((previousPage) =>
      Math.min(totalPages - 1, previousPage + 1),
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !book) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-500">{error || "Book not found"}</p>

          <Link
            href="/books"
            className="text-blue-600 hover:underline mt-2 inline-block"
          >
            ? Back to Books
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (book.status !== "ready") {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-yellow-600">Book is not ready for preview yet.</p>

          <p className="text-gray-500 text-sm mt-2">Status: {book.status}</p>

          <Link
            href={"/books/" + bookId}
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            ? Back to Book
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link
            href={"/books/" + bookId}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={18} />
            Back to Book
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowSolutions((previous) => !previous);
                setCurrentPage(0);
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {showSolutions ? (
                <>
                  <EyeOff size={18} />
                  Hide Solutions
                </>
              ) : (
                <>
                  <Eye size={18} />
                  Show Solutions
                </>
              )}
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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
          </div>
        </div>

        {/* Book Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-2xl font-bold text-gray-800">{book.title}</h1>

          <p className="text-gray-500">Theme: {book.theme}</p>

          <p className="text-sm text-gray-400 mt-1">
            {book.puzzleCount} puzzles ?{" "}
            {showSolutions ? "With solutions" : "Without solutions"}
          </p>
        </div>

        {/* Page Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Preview</h2>

            <span className="text-sm text-gray-400">
              Page {totalPages > 0 ? currentPage + 1 : 1} of {totalPages || 1}
            </span>
          </div>

          <div className="min-h-[400px] border border-gray-200 rounded-lg p-6 bg-gray-50">
            {currentPageData ? (
              currentPageData.type === "puzzle" ? (
                <PuzzlePageView
                  data={currentPageData.data}
                  number={currentPageData.number}
                />
              ) : (
                <SolutionPageView
                  data={currentPageData.data}
                  number={currentPageData.number}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                No pages to preview
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 0 || totalPages === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
              Previous
            </button>

            <span className="text-sm text-gray-500">
              {totalPages > 0 ? `${currentPage + 1} / ${totalPages}` : "0 / 0"}
            </span>

            <button
              onClick={goToNextPage}
              disabled={totalPages === 0 || currentPage >= totalPages - 1}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Puzzle Page View Component
function PuzzlePageView({ data, number }: { data: any; number: number }) {
  const puzzle = data?.puzzle;
  const puzzleData = puzzle?.data;

  const grid = Array.isArray(puzzleData?.grid) ? puzzleData.grid : [];

  const words = Array.isArray(puzzleData?.words) ? puzzleData.words : [];

  return (
    <div>
      <h3 className="text-xl font-bold text-center mb-4">Puzzle #{number}</h3>

      <p className="text-sm text-gray-600 text-center mb-4">
        Words to find:{" "}
        {words.length > 0
          ? words
              .map((word: any) =>
                typeof word === "string" ? word : word?.word || String(word),
              )
              .join(", ")
          : "None"}
      </p>

      {grid.length > 0 ? (
        <div className="flex justify-center overflow-auto">
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns:
                "repeat(" + (grid[0]?.length || 10) + ", minmax(0, 1fr))",
            }}
          >
            {grid.map((row: any[], i: number) =>
              Array.isArray(row)
                ? row.map((cell: any, j: number) => (
                    <div
                      key={i + "-" + j}
                      className="w-8 h-8 flex items-center justify-center text-sm font-mono border border-gray-300 bg-white"
                    >
                      {cell == null ? "" : String(cell)}
                    </div>
                  ))
                : null,
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-12">
          Puzzle grid unavailable
        </div>
      )}

      <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500">
        <span>Difficulty: {puzzle?.difficulty || "medium"}</span>

        {puzzle?.qualityScore !== null &&
          puzzle?.qualityScore !== undefined && (
            <span>Quality: {puzzle.qualityScore}/100</span>
          )}

        {data?.puzzleVersion?.versionNumber !== undefined && (
          <span>v{data.puzzleVersion.versionNumber}</span>
        )}
      </div>
    </div>
  );
}

// Solution Page View Component
function SolutionPageView({ data, number }: { data: any; number: number }) {
  const solution = data?.solution;
  const solutionWords = Array.isArray(solution?.data?.words)
    ? solution.data.words
    : [];

  return (
    <div>
      <h3 className="text-xl font-bold text-center mb-4">Solution #{number}</h3>

      {solutionWords.length > 0 ? (
        <div className="max-w-md mx-auto space-y-2">
          {solutionWords.map((word: any, index: number) => (
            <div
              key={index}
              className="flex justify-between items-center p-2 bg-white rounded border border-gray-200"
            >
              <span className="font-medium">
                {word?.word || "Unknown word"}
              </span>

              <span className="text-sm text-gray-500">
                ({word?.startRow ?? "?"},{word?.startCol ?? "?"}) ? (
                {word?.endRow ?? "?"},{word?.endCol ?? "?"})
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-12">
          No solution available
        </div>
      )}
    </div>
  );
}

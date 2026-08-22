"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BookPreview } from "@/components/book";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface PuzzlePreviewData {
  id: string;
  displayNumber: number;
  grid: string[][];
  words: string[];
  placedWords: any[];
  solution: any;
  difficultyScore?: number;
  difficultyLabel?: string;
}

interface BookPreviewData {
  bookId: string;
  title: string;
  theme: string;
  puzzleCount: number;
  puzzles: PuzzlePreviewData[];
  targetAudience?: string;
  difficultyLevel?: string;
}

export default function BookPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;

  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<BookPreviewData | null>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/books/${bookId}/preview`);
        const data = await response.json();

        if (data.success) {
          setBook(data.data);
        } else {
          toast.error(data.error || "Failed to load preview");
        }
      } catch (error) {
        console.error("Error fetching preview:", error);
        toast.error("Failed to load preview");
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      fetchPreview();
    }
  }, [bookId]);

  const handleExport = () => {
    toast.info("Export functionality coming soon!");
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin text-blue-500" />
            <p className="text-gray-500">Loading preview...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!book) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-700">Preview Not Available</h2>
          <p className="text-gray-500 mt-2">Could not load book preview.</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => router.push(`/books/${bookId}`)}
          >
            Back to Book
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
            onClick={() => router.push(`/books/${bookId}`)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Book Preview</h1>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-xl p-4">
          <BookPreview
            book={book}
            onExport={handleExport}
            onPrint={handlePrint}
          />
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-400 text-right">
          Preview mode · {book.puzzleCount} puzzles
        </div>
      </div>
    </DashboardLayout>
  );
}

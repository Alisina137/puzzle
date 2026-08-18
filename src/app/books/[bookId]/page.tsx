'use client';

import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { GenerationProgress } from '@/components/generation/GenerationProgress';
import { SortablePuzzleList } from '@/components/puzzle/SortablePuzzleList';
import { PreflightButton } from '@/components/pdf/PreflightButton';

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

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params?.bookId as string;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!bookId) {
      setError('No book ID provided');
      setLoading(false);
      return;
    }

    async function fetchBook() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/books/' + bookId);

        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }

        if (response.status === 404) {
          setError('Book not found');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch book');
        }

        const result = await response.json();
        setBook(result.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching book:', err);
        setError(err.message || 'Failed to load book');
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

    setIsExporting(true);

    try {
      const response = await fetch(
        '/api/books/' + bookId + '/export',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pageSize: 'A4',
            includeSolutions: true,
            solutionPlacement: 'back',
          }),
        },
      );

      if (!response.ok) {
        let message = 'Failed to export';

        try {
          const error = await response.json();
          message = error.error || message;
        } catch {
          // Keep default error message.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');

      link.href = url;
      link.download =
        book.title.replace(/[<>:"/\\|?*]+/g, '_') + '.pdf';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      alert(error.message || 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!book) {
      return;
    }

    const confirmed = confirm(
      'Are you sure you want to delete "' +
        book.title +
        '"? This will permanently remove all puzzles and cannot be undone.',
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        '/api/books/' + bookId,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to delete book');
      }

      router.push('/books');
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Failed to delete book. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleGenerationComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleGenerationError = (error: string) => {
    console.error('Generation error:', error);
    setRefreshKey((prev) => prev + 1);
  };

  const handleReorder = async (puzzleIds: string[]) => {
    try {
      const response = await fetch(
        '/api/books/' + bookId + '/puzzles/reorder',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order: puzzleIds,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to reorder puzzles');
      }

      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Reorder error:', error);
      throw error;
    }
  };

  const handlePuzzleUpdate = (updatedPuzzle: any) => {
    setBook((prevBook) => {
      if (!prevBook) {
        return prevBook;
      }

      const updatedBookPuzzles = prevBook.bookPuzzles.map(
        (bookPuzzle) =>
          bookPuzzle.id === updatedPuzzle.id
            ? updatedPuzzle
            : bookPuzzle,
      );

      return {
        ...prevBook,
        bookPuzzles: updatedBookPuzzles,
      };
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-600',
      generating: 'bg-yellow-100 text-yellow-700',
      ready: 'bg-green-100 text-green-700',
      exporting: 'bg-purple-100 text-purple-700',
      exported: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700',
    };

    return (
      styles[status] ||
      'bg-gray-100 text-gray-600'
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2
            size={32}
            className="animate-spin text-blue-600"
          />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !book) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-500">
            {error || 'Book not found'}
          </p>

          <button
            onClick={() =>
              setRefreshKey((prev) => prev + 1)
            }
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>

          <Link
            href="/books"
            className="text-blue-600 hover:underline mt-2 inline-block ml-4"
          >
            ? Back to Books
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
            href="/books"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={18} />
            Back to Books
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            {book.status === 'ready' && (
              <>
                {/* Preview */}
                <Link
                  href={'/books/' + bookId + '/preview'}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Eye size={18} />
                  Preview
                </Link>

                {/* KDP Preflight Check */}
                <PreflightButton
                  bookId={bookId}
                  onExport={handleExport}
                />
              </>
            )}

            {/* Delete */}
            <button
              onClick={handleDeleteBook}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
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

        {/* Book Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {book.title}
              </h1>

              <p className="text-gray-500">
                Theme: {book.theme}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={
                  'px-3 py-1 text-sm rounded-full ' +
                  getStatusBadge(book.status)
                }
              >
                {book.status}
              </span>

              <button
                onClick={() =>
                  setRefreshKey((prev) => prev + 1)
                }
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Refresh book"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Book Statistics */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {book.puzzleCount}
              </p>

              <p className="text-sm text-gray-500">
                Total Puzzles
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {book.bookPuzzles?.length || 0}
              </p>

              <p className="text-sm text-gray-500">
                Generated
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {book.qualityScore || 'N/A'}
              </p>

              <p className="text-sm text-gray-500">
                Quality Score
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">
                Created
              </p>

              <p className="text-sm font-medium text-gray-700">
                {new Date(
                  book.createdAt,
                ).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Generation Progress */}
        {(book.status === 'pending' ||
          book.status === 'generating' ||
          book.status === 'failed') && (
          <GenerationProgress
            bookId={book.id}
            onComplete={handleGenerationComplete}
            onError={handleGenerationError}
          />
        )}

        {/* Puzzle List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Puzzles
            </h2>

            <span className="text-sm text-gray-400">
              {book.bookPuzzles?.length || 0} of{' '}
              {book.puzzleCount} generated
            </span>
          </div>

          <SortablePuzzleList
            puzzles={book.bookPuzzles || []}
            bookId={book.id}
            onReorder={handleReorder}
            onPuzzleUpdate={handlePuzzleUpdate}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
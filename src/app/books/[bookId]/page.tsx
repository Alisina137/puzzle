'use client';

import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { GenerationProgress } from '@/components/generation/GenerationProgress';
import { PuzzleList } from '@/components/puzzle/PuzzleList';

interface BookPuzzle {
  id: string;
  position: number;
  displayNumber: number;
  puzzleId: string;
  puzzleVersionId: string;
  puzzle?: {
    id: string;
    type: string;
    data: unknown;
    difficulty: string | null;
    qualityScore: number | null;
  };
  puzzleVersion?: {
    id: string;
    versionNumber: number;
    data: unknown;
    isActive: boolean;
  };
  solution?: {
    id: string;
    data: unknown;
    validatedAt: string | null;
    isValid: boolean | null;
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

export default function BookPage() {
  const params = useParams();
  const bookId = params?.bookId as string;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!bookId) {
      setError('No book ID provided');
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchBook() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/books/' + bookId, {
          cache: 'no-store',
        });

        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }

        if (response.status === 404) {
          if (isMounted) {
            setError('Book not found');
            setBook(null);
          }
          return;
        }

        if (response.status === 403) {
          if (isMounted) {
            setError('You do not have permission to view this book.');
            setBook(null);
          }
          return;
        }

        if (!response.ok) {
          let message = 'Failed to fetch book';

          try {
            const errorResult = await response.json();
            if (errorResult?.error) {
              message = errorResult.error;
            }
          } catch {
            // Ignore JSON parsing errors
          }

          throw new Error(message);
        }

        const result = await response.json();

        if (!isMounted) {
          return;
        }

        if (!result?.data) {
          throw new Error('Invalid book data received from server');
        }

        console.log('Book data:', result.data);

        setBook(result.data);
        setError(null);
      } catch (err: unknown) {
        if (!isMounted) {
          return;
        }

        console.error('Error fetching book:', err);

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load book'
        );

        setBook(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchBook();

    return () => {
      isMounted = false;
    };
  }, [bookId, refreshKey]);

  const refreshBook = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleGenerationComplete = () => {
    refreshBook();
  };

  const handleGenerationError = (errorMessage: string) => {
    console.error('Generation error:', errorMessage);
    refreshBook();
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

    return styles[status] || 'bg-gray-100 text-gray-600';
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

          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={refreshBook}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>

            <Link
              href="/books"
              className="text-blue-600 hover:underline"
            >
              ← Back to Books
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const generatedCount = book.bookPuzzles?.length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <Link
          href="/books"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={18} />
          Back to Books
        </Link>

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
                type="button"
                onClick={refreshBook}
                aria-label="Refresh book"
                title="Refresh book"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

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
                {generatedCount}
              </p>
              <p className="text-sm text-gray-500">
                Generated
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {book.qualityScore ?? 'N/A'}
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
                {new Date(book.createdAt).toLocaleDateString()}
              </p>
            </div>

          </div>
        </div>

        {(book.status === 'pending' ||
          book.status === 'generating' ||
          book.status === 'failed') && (
          <GenerationProgress
            bookId={book.id}
            onComplete={handleGenerationComplete}
            onError={handleGenerationError}
          />
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Puzzles
            </h2>

            <span className="text-sm text-gray-400">
              {generatedCount} of {book.puzzleCount} generated
            </span>
          </div>

          <PuzzleList
            puzzles={book.bookPuzzles || []}
            bookId={book.id}
          />

        </div>

      </div>
    </DashboardLayout>
  );
}
'use client';

import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

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
  const bookId = params.bookId as string;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBook() {
      try {
        const response = await fetch('/api/books/' + bookId);

        if (!response.ok) {
          throw new Error('Failed to fetch book');
        }

        const result = await response.json();
        setBook(result.data);
      } catch (error) {
        setError('Failed to load book');
      } finally {
        setLoading(false);
      }
    }

    fetchBook();
  }, [bookId]);

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

          <Link
            href="/books"
            className="text-blue-600 hover:underline mt-2 inline-block"
          >
            Back to Books
          </Link>
        </div>
      </DashboardLayout>
    );
  }

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
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                type="button"
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
                {book.bookPuzzles?.length || 0}
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Puzzles
          </h2>

          <div className="text-center py-12 text-gray-500">
            <p>
              Puzzle editor coming soon...
            </p>

            <p className="text-sm mt-1">
              You will be able to view, regenerate, and reorder puzzles here
            </p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import {
  PlusCircle,
  BookOpen,
  ArrowRight,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { BookCardSkeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { toast } from "sonner";

interface Book {
  id: string;
  title: string;
  theme: string;
  puzzleCount: number;
  status: string;
  qualityScore: number | null;
  createdAt: string;
}

const PAGE_SIZE = 9;

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/books');

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }

      const result = await response.json();
      const booksData = result.data?.books || result.data || [];

      setBooks(booksData);
      setTotalBooks(booksData.length);
    } catch (error) {
      console.error('Error fetching books:', error);
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${bookTitle}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    const toastId = toast.loading("Deleting book...");

    setDeletingBookId(bookId);
    try {
      const response = await fetch("/api/books/" + bookId, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete book");
      }

      toast.dismiss(toastId);
      toast.success("Book deleted successfully! 🗑️");

      await fetchBooks();
    } catch (error) {
      console.error("Error deleting book:", error);
      toast.dismiss(toastId);
      toast.error("Failed to delete book. Please try again.");
    } finally {
      setDeletingBookId(null);
    }
  };

  const totalPages = Math.ceil(totalBooks / PAGE_SIZE);

  const paginatedBooks = books.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                My Books
              </h1>

              <p className="text-gray-500 mt-1">
                Loading your books...
              </p>
            </div>

            <div className="w-32 h-10 bg-gray-200 rounded-lg animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-red-500">{error}</p>

          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              My Books
            </h1>

            <p className="text-gray-500 mt-1">
              Manage your puzzle books
            </p>
          </div>

          <Link
            href="/books/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle size={18} />
            Create Book
          </Link>
        </div>

        {/* Empty State */}
        {books.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <BookOpen
              size={48}
              className="text-gray-300 mx-auto mb-4"
            />

            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No books yet
            </h3>

            <p className="text-gray-500 text-sm mb-4">
              Create your first puzzle book to get started.
            </p>

            <Link
              href="/books/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusCircle size={18} />
              Create Your First Book
            </Link>
          </div>
        ) : (
          <>
            {/* Books Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedBooks.map((book) => (
                <div
                  key={book.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-6 group"
                >
                  {/* Book Link */}
                  <Link
                    href={'/books/' + book.id}
                    className="block"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                          {book.title}
                        </h3>

                        <p className="text-sm text-gray-500 truncate">
                          Theme: {book.theme}
                        </p>
                      </div>

                      <span
                        className={
                          'shrink-0 px-2 py-0.5 text-xs rounded-full ' +
                          getStatusBadge(book.status)
                        }
                      >
                        {book.status}
                      </span>
                    </div>
                  </Link>

                  {/* Card Footer */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {book.puzzleCount} puzzles
                    </span>

                    <div className="flex items-center gap-1">

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteBook(
                            book.id,
                            book.title
                          )
                        }
                        disabled={deletingBookId === book.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete book"
                        aria-label={'Delete ' + book.title}
                      >
                        {deletingBookId === book.id ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>

                      {/* Open Book */}
                      <Link
                        href={'/books/' + book.id}
                        className="p-1.5 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Open book"
                        aria-label={'Open ' + book.title}
                      >
                        <ArrowRight
                          size={16}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
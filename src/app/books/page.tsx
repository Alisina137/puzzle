"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  PlusCircle,
  Trash2,
  Eye,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { BookCardSkeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { toast } from "sonner";

interface Book {
  id: string;
  title: string;
  theme: string;
  puzzleCount: number;
  status: string;
  qualityScore: number | null;
  createdAt: string;
  targetAudience?: string | null;
  difficultyLevel?: string | null;
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageSize = 12;

  const fetchBooks = async (showLoading: boolean = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const response = await fetch("/api/books");
      if (response.ok) {
        const result = await response.json();
        const bookData = result.data || [];
        setBooks(bookData);
        setTotalBooks(bookData.length);
      } else {
        throw new Error("Failed to fetch books");
      }
    } catch (err) {
      console.error("Error fetching books:", err);
      setError("Failed to load books");
    } finally {
      if (showLoading) setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchBooks(true);
  }, []);

  // Poll for status updates every 3 seconds if there are pending books
  useEffect(() => {
    const hasPending = books.some(
      (book) => book.status === "pending" || book.status === "generating",
    );

    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchBooks(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [books]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchBooks(false);
  };

  const handleDelete = async (bookId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    setDeletingBookId(bookId);
    const toastId = toast.loading("Deleting book...");

    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete book");

      toast.dismiss(toastId);
      toast.success(`"${title}" deleted successfully`);
      fetchBooks(true);
    } catch (error) {
      console.error("Error deleting book:", error);
      toast.dismiss(toastId);
      toast.error("Failed to delete book");
    } finally {
      setDeletingBookId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      generating: "bg-blue-100 text-blue-700",
      ready: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
    };

    return styles[status] || "bg-gray-100 text-gray-600";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock size={14} className="text-yellow-600" />;
      case "generating":
        return <Loader2 size={14} className="animate-spin text-blue-600" />;
      case "ready":
        return <CheckCircle size={14} className="text-green-600" />;
      case "failed":
        return <AlertCircle size={14} className="text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Books</h1>
            <p className="text-gray-500 mt-1">Loading your books...</p>
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
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => fetchBooks(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const paginatedBooks = books.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const hasPending = books.some(
    (book) => book.status === "pending" || book.status === "generating",
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Books</h1>
            <p className="text-gray-500 mt-1">
              {totalBooks} book{totalBooks !== 1 ? "s" : ""} found
              {hasPending && (
                <span className="ml-2 text-sm text-blue-600 animate-pulse">
                  (Updating...)
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                className={isRefreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
            <Link
              href="/books/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusCircle size={18} />
              Create Book
            </Link>
          </div>
        </div>

        {books.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-600">No books yet</h3>
            <p className="text-gray-400 text-sm mt-1">
              Create your first puzzle book to get started
            </p>
            <Link
              href="/books/new"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Book
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedBooks.map((book) => {
                const statusClass = getStatusBadge(book.status);
                const StatusIcon = getStatusIcon(book.status);
                const isUpdating =
                  book.status === "pending" || book.status === "generating";

                return (
                  <div
                    key={book.id}
                    className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow ${
                      isUpdating ? "border-blue-300 shadow-blue-100" : ""
                    }`}
                  >
                    {/* Header: Title + Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/books/${book.id}`}
                          className="block group"
                        >
                          <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                            {book.title}
                          </h3>
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${statusClass}`}
                        >
                          {StatusIcon}
                          {book.status}
                        </span>
                      </div>
                    </div>

                    {/* Book Details in Labeled Format */}
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      <div>
                        <span className="text-gray-400">Theme</span>
                        <p className="font-medium text-gray-700 truncate">
                          {book.theme}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Puzzles</span>
                        <p className="font-medium text-gray-700">
                          {book.puzzleCount}
                        </p>
                      </div>
                      {book.targetAudience && (
                        <div>
                          <span className="text-gray-400">Audience</span>
                          <p className="font-medium text-gray-700">
                            {book.targetAudience}
                          </p>
                        </div>
                      )}
                      {book.difficultyLevel && (
                        <div>
                          <span className="text-gray-400">Difficulty</span>
                          <p className="font-medium text-gray-700">
                            {book.difficultyLevel}
                          </p>
                        </div>
                      )}
                      {book.qualityScore !== null &&
                        book.qualityScore !== undefined && (
                          <div>
                            <span className="text-gray-400">Quality</span>
                            <p className="font-medium text-gray-700">
                              {Math.round(book.qualityScore)}%
                            </p>
                          </div>
                        )}
                      <div>
                        <span className="text-gray-400">Created</span>
                        <p className="font-medium text-gray-700 text-xs">
                          {new Date(book.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2 pt-3 border-t border-gray-100">
                      <Link
                        href={`/books/${book.id}`}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(book.id, book.title)}
                        disabled={deletingBookId === book.id}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingBookId === book.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalBooks > pageSize && (
              <div className="flex justify-center mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalBooks / pageSize)}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import {
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
} from 'lucide-react';
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

interface PageItem {
  type: 'puzzle' | 'solution';
  number: number;
  data: any;
}

// Color palette for different words
const WORD_COLORS = [
  { bg: 'bg-red-200', border: 'border-red-400', hover: 'hover:bg-red-300' },
  { bg: 'bg-blue-200', border: 'border-blue-400', hover: 'hover:bg-blue-300' },
  { bg: 'bg-green-200', border: 'border-green-400', hover: 'hover:bg-green-300' },
  { bg: 'bg-yellow-200', border: 'border-yellow-400', hover: 'hover:bg-yellow-300' },
  { bg: 'bg-purple-200', border: 'border-purple-400', hover: 'hover:bg-purple-300' },
  { bg: 'bg-pink-200', border: 'border-pink-400', hover: 'hover:bg-pink-300' },
  { bg: 'bg-orange-200', border: 'border-orange-400', hover: 'hover:bg-orange-300' },
  { bg: 'bg-teal-200', border: 'border-teal-400', hover: 'hover:bg-teal-300' },
  { bg: 'bg-indigo-200', border: 'border-indigo-400', hover: 'hover:bg-indigo-300' },
  { bg: 'bg-rose-200', border: 'border-rose-400', hover: 'hover:bg-rose-300' },
  { bg: 'bg-amber-200', border: 'border-amber-400', hover: 'hover:bg-amber-300' },
  { bg: 'bg-cyan-200', border: 'border-cyan-400', hover: 'hover:bg-cyan-300' },
];

// Overlap pattern styles
const overlapPatterns = [
  {
    bg: 'bg-gradient-to-br from-red-200 to-blue-200',
    border: 'border-purple-500',
  },
  {
    bg: 'bg-gradient-to-tr from-green-200 to-yellow-200',
    border: 'border-purple-500',
  },
  {
    bg: 'bg-gradient-to-bl from-purple-200 to-pink-200',
    border: 'border-purple-500',
  },
  {
    bg: 'bg-gradient-to-tl from-orange-200 to-teal-200',
    border: 'border-purple-500',
  },
  {
    bg: 'bg-gradient-to-r from-indigo-200 to-rose-200',
    border: 'border-purple-500',
  },
  {
    bg: 'bg-gradient-to-b from-amber-200 to-cyan-200',
    border: 'border-purple-500',
  },
];

export default function BookPreviewPage() {
  const params = useParams();
  const bookId = params?.bookId as string;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showSolutions, setShowSolutions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pages, setPages] = useState<PageItem[]>([]);

  /*
   * Fetch book
   */
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
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch book');
        }

        const result = await response.json();

        if (!result?.data) {
          throw new Error('Invalid book response');
        }

        setBook(result.data);
      } catch (err: any) {
        console.error('Error fetching book:', err);
        setError(err.message || 'Failed to load book');
      } finally {
        setLoading(false);
      }
    }

    fetchBook();
  }, [bookId]);

  /*
   * Build preview pages whenever the book or solution visibility changes.
   */
  useEffect(() => {
    if (!book) {
      setPages([]);
      return;
    }

    buildPages(book, showSolutions);
    setCurrentPage(0);
  }, [book, showSolutions]);

  /*
   * Build puzzle/solution pages.
   *
   * When solutions are hidden:
   *   Puzzle 1, Puzzle 2, Puzzle 3...
   *
   * When solutions are visible:
   *   Puzzle 1, Solution 1, Puzzle 2, Solution 2...
   */
  const buildPages = (bookData: Book, includeSolutions: boolean) => {
    const bookPuzzles = Array.isArray(bookData.bookPuzzles)
      ? bookData.bookPuzzles
      : [];

    const puzzlePages: PageItem[] = bookPuzzles.map(
      (bp: any, index: number) => ({
        type: 'puzzle',
        number: index + 1,
        data: bp,
      })
    );

    if (!includeSolutions) {
      setPages(puzzlePages);
      return;
    }

    const interleavedPages: PageItem[] = [];

    puzzlePages.forEach((puzzlePage) => {
      interleavedPages.push(puzzlePage);

      interleavedPages.push({
        type: 'solution',
        number: puzzlePage.number,
        data: puzzlePage.data,
      });
    });

    setPages(interleavedPages);
  };

  /*
   * Export PDF
   */
  const handleExport = async () => {
    if (!book || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch('/api/books/' + bookId + '/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageSize: 'A4',
          includeSolutions: showSolutions,
          solutionPlacement: showSolutions ? 'after' : 'back',
        }),
      });

      if (!response.ok) {
        let message = 'Failed to export';

        try {
          const errorData = await response.json();
          message = errorData?.error || message;
        } catch {
          // Response was not JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download =
        book.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_') +
        '.pdf';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export error:', err);
      alert(err.message || 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = pages.length;
  const currentPageData = pages[currentPage] || null;

  /*
   * Pagination
   */
  const goToPreviousPage = () => {
    setCurrentPage((page) => Math.max(0, page - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((page) =>
      Math.min(Math.max(totalPages - 1, 0), page + 1)
    );
  };

  /*
   * Loading state
   */
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

  /*
   * Error state
   */
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
            ? Back to Books
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  /*
   * Book not ready
   */
  if (book.status !== 'ready') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-yellow-600">
            Book is not ready for preview yet.
          </p>

          <p className="text-gray-500 text-sm mt-2">
            Status: {book.status}
          </p>

          <Link
            href={'/books/' + bookId}
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

        {/* Header actions */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link
            href={'/books/' + bookId}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={18} />
            Back to Book
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSolutions((value) => !value)}
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
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
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

        {/* Book information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {book.title}
          </h1>

          <p className="text-gray-500">
            Theme: {book.theme}
          </p>

          <p className="text-sm text-gray-400 mt-1">
            {book.puzzleCount} puzzles ?{' '}
            {showSolutions
              ? 'With solutions'
              : 'Without solutions'}
          </p>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Preview
            </h2>

            <span className="text-sm text-gray-400">
              Page {totalPages > 0 ? currentPage + 1 : 0} of{' '}
              {totalPages}
            </span>
          </div>

          <div className="min-h-[400px] border border-gray-200 rounded-lg p-6 bg-gray-50">
            {currentPageData ? (
              currentPageData.type === 'puzzle' ? (
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

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between mt-4 gap-4">
              <button
                type="button"
                onClick={goToPreviousPage}
                disabled={currentPage === 0}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
                Previous
              </button>

              <div className="flex items-center gap-1 overflow-x-auto max-w-[60%]">
                {Array.from({
                  length: Math.min(totalPages, 10),
                }).map((_, index) => {
                  /*
                   * Show a moving window of 10 pages when the book
                   * contains more than 10 pages.
                   */
                  let pageNum = index;

                  if (totalPages > 10) {
                    const maxStart = totalPages - 10;
                    const start = Math.min(
                      Math.max(currentPage - 4, 0),
                      maxStart
                    );

                    pageNum = start + index;
                  }

                  const isActive = pageNum === currentPage;

                  return (
                    <button
                      type="button"
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={
                        'w-8 h-8 min-w-8 rounded-lg text-sm transition-colors ' +
                        (isActive
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50')
                      }
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={goToNextPage}
                disabled={
                  currentPage >= totalPages - 1
                }
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

/*
 * Puzzle Page
 */
function PuzzlePageView({
  data,
  number,
}: {
  data: any;
  number: number;
}) {
  const puzzle = data?.puzzle;
  const puzzleData = puzzle?.data || {};

  const grid: string[][] = Array.isArray(puzzleData.grid)
    ? puzzleData.grid
    : [];

  const words: string[] = Array.isArray(puzzleData.words)
    ? puzzleData.words
    : [];

  const gridSize = grid.length;

  const colLabels = Array.from(
    { length: gridSize },
    (_, i) => getColumnLabel(i)
  );

  return (
    <div>
      <h3 className="text-xl font-bold text-center mb-4">
        Puzzle #{number}
      </h3>

      <p className="text-sm text-gray-600 text-center mb-4">
        Words to find:{' '}
        {words.length > 0
          ? words.join(', ')
          : 'No words available'}
      </p>

      {/* Grid */}
      {grid.length > 0 ? (
        <div className="flex justify-center overflow-x-auto">
          <div>
            {/* Column labels */}
            <div className="flex">
              <div className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0" />

              {colLabels.map((label, idx) => (
                <div
                  key={idx}
                  className="w-8 h-6 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {grid.map((row, i) => (
              <div key={i} className="flex">
                {/* Row number */}
                <div className="w-6 h-8 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                  {i + 1}
                </div>

                {row.map((cell, j) => (
                  <div
                    key={i + '-' + j}
                    className="w-8 h-8 flex items-center justify-center text-sm font-mono border border-gray-300 bg-white flex-shrink-0"
                  >
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-12">
          No puzzle grid available
        </div>
      )}

      {/* Puzzle metadata */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
        <span>
          Difficulty:{' '}
          {puzzle?.difficulty || 'medium'}
        </span>

        {puzzle?.qualityScore != null && (
          <span>
            Quality: {puzzle.qualityScore}/100
          </span>
        )}

        {data?.puzzleVersion?.versionNumber != null && (
          <span>
            v{data.puzzleVersion.versionNumber}
          </span>
        )}
      </div>
    </div>
  );
}

/*
 * Solution Page
 */
function SolutionPageView({
  data,
  number,
}: {
  data: any;
  number: number;
}) {
  const solution = data?.solution;

  const solutionWords = Array.isArray(
    solution?.data?.words
  )
    ? solution.data.words
    : [];

  const puzzleData = data?.puzzle?.data || {};

  const grid: string[][] = Array.isArray(puzzleData.grid)
    ? puzzleData.grid
    : [];

  const gridSize = grid.length;

  const colLabels = Array.from(
    { length: gridSize },
    (_, i) => getColumnLabel(i)
  );

  /*
   * Map each cell to the words that cover it.
   *
   * Example:
   *
   * "4,7": ["APPLE"]
   *
   * or for an overlap:
   *
   * "4,7": ["APPLE", "PEAR"]
   */
  const cellWordMap: Record<string, string[]> = {};

  solutionWords.forEach((wordData: any) => {
    const startRow = Number(wordData?.startRow);
    const startCol = Number(wordData?.startCol);
    const endRow = Number(wordData?.endRow);
    const endCol = Number(wordData?.endCol);

    if (
      !Number.isFinite(startRow) ||
      !Number.isFinite(startCol) ||
      !Number.isFinite(endRow) ||
      !Number.isFinite(endCol) ||
      !wordData?.word
    ) {
      return;
    }

    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    /*
     * Word-search puzzles can be horizontal, vertical,
     * or diagonal.
     *
     * The original implementation filled the entire rectangle,
     * which is incorrect for diagonal words.
     *
     * We therefore calculate the actual row/column step.
     */
    const rowStep =
      endRow === startRow
        ? 0
        : endRow > startRow
          ? 1
          : -1;

    const colStep =
      endCol === startCol
        ? 0
        : endCol > startCol
          ? 1
          : -1;

    const distance = Math.max(
      Math.abs(endRow - startRow),
      Math.abs(endCol - startCol)
    );

    for (let step = 0; step <= distance; step++) {
      const row = startRow + step * rowStep;
      const col = startCol + step * colStep;

      if (
        row < 0 ||
        col < 0 ||
        row >= gridSize ||
        col >= (grid[row]?.length || 0)
      ) {
        continue;
      }

      const key = row + ',' + col;

      if (!cellWordMap[key]) {
        cellWordMap[key] = [];
      }

      if (!cellWordMap[key].includes(wordData.word)) {
        cellWordMap[key].push(wordData.word);
      }
    }
  });

  /*
   * Assign a color to every word.
   */
  const wordColorMap: Record<string, number> = {};

  solutionWords.forEach(
    (wordData: any, index: number) => {
      if (wordData?.word) {
        wordColorMap[wordData.word] =
          index % WORD_COLORS.length;
      }
    }
  );

  /*
   * Get the color for a cell.
   */
  const getCellColor = (
    row: number,
    col: number
  ) => {
    const key = row + ',' + col;
    const words = cellWordMap[key] || [];

    if (words.length === 0) {
      return {
        bg: 'bg-white',
        border: 'border-gray-300',
      };
    }

    if (words.length === 1) {
      const colorIndex =
        wordColorMap[words[0]] ?? 0;

      return WORD_COLORS[colorIndex];
    }

    /*
     * Multiple words in the same cell = overlap.
     */
    const overlapIndex = Math.min(
      words.length - 1,
      overlapPatterns.length - 1
    );

    return overlapPatterns[overlapIndex];
  };

  const hasOverlap = (
    row: number,
    col: number
  ): boolean => {
    const key = row + ',' + col;

    return (
      (cellWordMap[key] || []).length > 1
    );
  };

  const getOverlapWords = (
    row: number,
    col: number
  ): string[] => {
    const key = row + ',' + col;

    return cellWordMap[key] || [];
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-center mb-4">
        Solution #{number}
      </h3>

      {solutionWords.length > 0 ? (
        <div>
          {/* Color legend */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {solutionWords.map(
              (wordData: any, index: number) => {
                const colorIndex =
                  index % WORD_COLORS.length;

                return (
                  <span
                    key={index}
                    className={
                      'px-2 py-1 text-xs font-medium rounded ' +
                      WORD_COLORS[colorIndex].bg +
                      ' border ' +
                      WORD_COLORS[colorIndex].border
                    }
                  >
                    {wordData.word}
                  </span>
                );
              }
            )}

            <span className="px-2 py-1 text-xs font-medium rounded bg-gradient-to-r from-purple-200 to-pink-200 border border-purple-500">
              ? Overlap
            </span>
          </div>

          {/* Solution grid */}
          {grid.length > 0 ? (
            <div className="flex justify-center overflow-x-auto">
              <div>
                {/* Column labels */}
                <div className="flex">
                  <div className="w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0" />

                  {colLabels.map(
                    (label, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-6 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0"
                      >
                        {label}
                      </div>
                    )
                  )}
                </div>

                {/* Grid */}
                {grid.map((row, i) => (
                  <div
                    key={i}
                    className="flex"
                  >
                    {/* Row number */}
                    <div className="w-6 h-8 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                      {i + 1}
                    </div>

                    {row.map(
                      (cell, j) => {
                        const color =
                          getCellColor(
                            i,
                            j
                          );

                        const isOverlap =
                          hasOverlap(
                            i,
                            j
                          );

                        const overlapWords =
                          getOverlapWords(
                            i,
                            j
                          );

                        return (
                          <div
                            key={
                              i +
                              '-' +
                              j
                            }
                            className={
                              'w-8 h-8 flex items-center justify-center text-sm font-mono border flex-shrink-0 relative ' +
                              color.bg +
                              ' ' +
                              color.border
                            }
                            title={
                              isOverlap
                                ? 'Overlap: ' +
                                  overlapWords.join(
                                    ' + '
                                  )
                                : overlapWords[0] ||
                                  ''
                            }
                          >
                            {cell}

                            {isOverlap && (
                              <span className="absolute -top-1 -right-1 text-[8px] text-purple-600 font-bold">
                                ?
                              </span>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              No puzzle grid available
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-12">
          No solution available
        </div>
      )}
    </div>
  );
}

/*
 * Convert a zero-based column number to letters.
 *
 * 0  -> A
 * 1  -> B
 * ...
 * 25 -> Z
 * 26 -> AA
 * 27 -> AB
 */
function getColumnLabel(index: number): string {
  let label = '';
  let value = index + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label =
      String.fromCharCode(65 + remainder) +
      label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}
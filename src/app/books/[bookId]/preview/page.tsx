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
  const [pages, setPages] = useState<any[]>([]);

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

        if (!result.data) {
          throw new Error('Book data was not returned');
        }

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
  }, [bookId]);

  useEffect(() => {
    if (!book) {
      return;
    }

    buildPages(book);
    setCurrentPage(0);
  }, [book, showSolutions]);

  const buildPages = (bookData: Book) => {
    const bookPuzzles = bookData.bookPuzzles || [];

    const puzzlePages = bookPuzzles.map((bp: any, index: number) => ({
      type: 'puzzle',
      number: index + 1,
      data: bp,
    }));

    if (!showSolutions) {
      setPages(puzzlePages);
      return;
    }

    const solutionPages = bookPuzzles.map((bp: any, index: number) => ({
      type: 'solution',
      number: index + 1,
      data: bp,
    }));

    const interleaved: any[] = [];

    for (let i = 0; i < puzzlePages.length; i++) {
      interleaved.push(puzzlePages[i]);
      interleaved.push(solutionPages[i]);
    }

    setPages(interleaved);
  };

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
          const error = await response.json();
          message = error.error || message;
        } catch {
          // Ignore JSON parsing errors
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = book.title.replace(/\s+/g, '_') + '.pdf';

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

  const totalPages = pages.length;
  const currentPageData = pages[currentPage] || null;

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    }
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

        {/* Header */}
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
              onClick={() => setShowSolutions((prev) => !prev)}
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

        {/* Book Information */}
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

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({
                length: Math.min(totalPages, 10),
              }).map((_, index) => {
                const pageNum = index;
                const isActive = pageNum === currentPage;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={
                      'w-8 h-8 rounded-lg text-sm transition-colors ' +
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
              onClick={goToNextPage}
              disabled={
                totalPages === 0 ||
                currentPage >= totalPages - 1
              }
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

/**
 * Get all cells occupied by a word.
 *
 * This correctly handles horizontal, vertical,
 * and diagonal words without filling the rectangle
 * between start and end coordinates.
 */
function getWordCells(word: any): Array<[number, number]> {
  const {
    startRow,
    startCol,
    endRow,
    endCol,
  } = word;

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

  const rowDistance = Math.abs(endRow - startRow);
  const colDistance = Math.abs(endCol - startCol);

  const steps = Math.max(rowDistance, colDistance);
  const cells: Array<[number, number]> = [];

  for (let i = 0; i <= steps; i++) {
    cells.push([
      startRow + i * rowStep,
      startCol + i * colStep,
    ]);
  }

  return cells;
}

// Puzzle Page View Component
function PuzzlePageView({
  data,
  number,
}: {
  data: any;
  number: number;
}) {
  const grid = data?.puzzle?.data?.grid || [];
  const words = data?.puzzle?.data?.words || [];

  const gridSize = grid.length;

  const colLabels = Array.from(
    { length: gridSize },
    (_, i) => String.fromCharCode(65 + i)
  );

  return (
    <div>
      <h3 className="text-xl font-bold text-center mb-4">
        Puzzle #{number}
      </h3>

      <p className="text-sm text-gray-600 text-center mb-4">
        Words to find: {words.join(', ')}
      </p>

      {grid.length > 0 ? (
        <div className="flex justify-center overflow-x-auto">
          <div>
            {/* Column headers */}
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

            {/* Grid */}
            {grid.map((row: string[], i: number) => (
              <div key={i} className="flex">
                <div className="w-6 h-8 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                  {i + 1}
                </div>

                {row.map((cell: string, j: number) => (
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

      <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500">
        <span>
          Difficulty: {data?.puzzle?.difficulty || 'medium'}
        </span>

        {data?.puzzle?.qualityScore != null && (
          <span>
            Quality: {data.puzzle.qualityScore}/100
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

// Solution Page View Component
function SolutionPageView({
  data,
  number,
}: {
  data: any;
  number: number;
}) {
  const solution = data?.solution;
  const solutionWords = solution?.data?.words || [];
  const grid = data?.puzzle?.data?.grid || [];

  const gridSize = grid.length;

  const colLabels = Array.from(
    { length: gridSize },
    (_, i) => String.fromCharCode(65 + i)
  );

  // Build a map of which words cover each cell.
  const cellWordMap: Record<string, string[]> = {};

  solutionWords.forEach((word: any) => {
    const cells = getWordCells(word);

    cells.forEach(([row, col]) => {
      const key = row + ',' + col;

      if (!cellWordMap[key]) {
        cellWordMap[key] = [];
      }

      if (!cellWordMap[key].includes(word.word)) {
        cellWordMap[key].push(word.word);
      }
    });
  });

  // Assign colors to each word.
  const wordColorMap: Record<string, number> = {};

  solutionWords.forEach((word: any, index: number) => {
    wordColorMap[word.word] =
      index % WORD_COLORS.length;
  });

  const getCellWords = (
    row: number,
    col: number
  ): string[] => {
    const key = row + ',' + col;
    return cellWordMap[key] || [];
  };

  const hasOverlap = (
    row: number,
    col: number
  ): boolean => {
    return getCellWords(row, col).length > 1;
  };

  const getCellColor = (
    row: number,
    col: number
  ) => {
    const words = getCellWords(row, col);

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

    // Multiple words overlap on this cell.
    const overlapIndex = Math.min(
      words.length - 2,
      overlapPatterns.length - 1
    );

    return overlapPatterns[overlapIndex];
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-center mb-4">
        Solution #{number}
      </h3>

      {solutionWords.length > 0 ? (
        <div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {solutionWords.map(
              (word: any, index: number) => {
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
                    {word.word}
                  </span>
                );
              }
            )}

            <span className="px-2 py-1 text-xs font-medium rounded bg-gradient-to-r from-purple-200 to-pink-200 border border-purple-500">
              Overlap
            </span>
          </div>

          {/* Solution Grid */}
          {grid.length > 0 ? (
            <div className="flex justify-center overflow-x-auto mb-4">
              <div>
                {/* Column headers */}
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

                {/* Grid */}
                {grid.map(
                  (row: string[], rowIndex: number) => (
                    <div
                      key={rowIndex}
                      className="flex"
                    >
                      <div className="w-6 h-8 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                        {rowIndex + 1}
                      </div>

                      {row.map(
                        (
                          cell: string,
                          colIndex: number
                        ) => {
                          const words = getCellWords(
                            rowIndex,
                            colIndex
                          );

                          const color = getCellColor(
                            rowIndex,
                            colIndex
                          );

                          const isOverlap =
                            hasOverlap(
                              rowIndex,
                              colIndex
                            );

                          return (
                            <div
                              key={
                                rowIndex +
                                '-' +
                                colIndex
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
                                    words.join(' + ')
                                  : words[0] || ''
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
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              No puzzle grid available
            </div>
          )}

          {/* Word Locations */}
          <div className="max-w-md mx-auto space-y-2">
            {solutionWords.map(
              (word: any, index: number) => {
                const colorIndex =
                  index % WORD_COLORS.length;

                const wordHasOverlap =
                  Object.values(cellWordMap).some(
                    (words) =>
                      words.length > 1 &&
                      words.includes(word.word)
                  );

                return (
                  <div
                    key={index}
                    className={
                      'flex justify-between items-center p-2 rounded border ' +
                      WORD_COLORS[colorIndex].bg +
                      ' ' +
                      WORD_COLORS[colorIndex].border
                    }
                  >
                    <span className="font-medium">
                      {word.word}
                    </span>

                    <span className="text-sm text-gray-600">
                      {String.fromCharCode(
                        65 + word.startCol
                      )}
                      {word.startRow + 1}
                      {' ? '}
                      {String.fromCharCode(
                        65 + word.endCol
                      )}
                      {word.endRow + 1}

                      {wordHasOverlap && (
                        <span className="ml-2 text-purple-600 text-xs">
                          ?? overlaps
                        </span>
                      )}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-12">
          No solution available
        </div>
      )}
    </div>
  );
}
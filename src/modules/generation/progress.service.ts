import { prisma } from '@/lib/prisma';
import { generationQueue } from '@/lib/queue';

export interface ProgressStatus {
  bookId: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  progress: number;
  generated: number;
  total: number;
  failedPuzzles: number;
  jobId?: string;
  error?: string;
  qualityScore?: number;
}

export class ProgressService {
  /**
   * Get the current generation progress for a book.
   */
  static async getProgress(bookId: string): Promise<ProgressStatus> {
    const book = await prisma.book.findUnique({
      where: {
        id: bookId,
      },
      include: {
        bookPuzzles: true,
      },
    });

    if (!book) {
      throw new Error('Book not found');
    }

    const generated = book.bookPuzzles.length;
    const total = book.puzzleCount;

    const calculatedProgress =
      total > 0
        ? Math.round((generated / total) * 100)
        : 0;

    const progress: ProgressStatus = {
      bookId: book.id,
      status: book.status as ProgressStatus['status'],
      progress: calculatedProgress,
      generated,
      total,
      failedPuzzles: 0,
      qualityScore: book.qualityScore
        ? Number(book.qualityScore)
        : undefined,
    };

    // Find the active generation job for this book.
    try {
      const jobs = await generationQueue.getJobs([
        'waiting',
        'active',
        'delayed',
      ]);

      const job = jobs.find(
        (candidate) => candidate.data?.bookId === bookId,
      );

      if (job) {
        progress.jobId = job.id;

        progress.progress =
          typeof job.progress === 'number'
            ? job.progress
            : calculatedProgress;

        if (book.status === 'pending') {
          progress.status = 'pending';
        } else if (book.status === 'generating') {
          progress.status = 'generating';
        }
      }
    } catch (error) {
      console.error(
        'Failed to get generation job progress:',
        error,
      );
    }

    return progress;
  }

  /**
   * Cancel the active generation job for a book.
   */
  static async cancelGeneration(
    bookId: string,
  ): Promise<boolean> {
    try {
      const jobs = await generationQueue.getJobs([
        'waiting',
        'active',
        'delayed',
      ]);

      const job = jobs.find(
        (candidate) => candidate.data?.bookId === bookId,
      );

      if (!job) {
        return false;
      }

      await job.remove();

      return true;
    } catch (error) {
      console.error(
        'Failed to cancel generation:',
        error,
      );

      throw error;
    }
  }
}
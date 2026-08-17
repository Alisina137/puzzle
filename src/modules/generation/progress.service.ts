import { prisma } from '@/lib/prisma';
import { generationQueue, getQueueStatus } from '@/lib/queue.js';

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
  static async getProgress(bookId: string): Promise<ProgressStatus> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        status: true,
        puzzleCount: true,
        qualityScore: true,
        bookPuzzles: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!book) {
      throw new Error('Book not found');
    }

    const jobs = await generationQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
    const job = jobs.find((j) => j.data.bookId === bookId);

    const progress: ProgressStatus = {
      bookId: book.id,
      status: book.status as 'pending' | 'generating' | 'ready' | 'failed',
      progress: 0,
      generated: book.bookPuzzles?.length || 0,
      total: book.puzzleCount,
      failedPuzzles: 0,
      qualityScore: book.qualityScore || undefined,
    };

    if (job) {
      progress.jobId = job.id;
      progress.progress = job.progress || 0;

      if (job.failedReason) {
        progress.error = job.failedReason;
      }

      if (job.returnvalue) {
        const result = job.returnvalue as any;
        progress.failedPuzzles = result.failedPuzzles || 0;
      }
    } else if (book.status === 'ready') {
      progress.progress = 100;
    } else if (book.status === 'failed') {
      progress.progress = 0;
    }

    return progress;
  }

  static async getQueueStatus() {
    return getQueueStatus('puzzle-generation');
  }

  static async cancelGeneration(bookId: string): Promise<boolean> {
    const jobs = await generationQueue.getJobs(['active', 'waiting']);
    const job = jobs.find((j) => j.data.bookId === bookId);

    if (!job) {
      return false;
    }

    await job.remove();
    return true;
  }

  static formatProgress(progress: ProgressStatus): string {
    const percentage = progress.progress || 0;
    const statusEmojis: Record<string, string> = {
      pending: '?',
      generating: '??',
      ready: '?',
      failed: '?',
    };

    const emoji = statusEmojis[progress.status] || '?';
    const statusText = progress.status.charAt(0).toUpperCase() + progress.status.slice(1);

    let message = emoji + ' ' + statusText + ': ' + percentage + '%';

    if (progress.generated > 0) {
      message = message + ' (' + progress.generated + '/' + progress.total + ' puzzles)';
    }

    if (progress.failedPuzzles > 0) {
      message = message + ' ?? ' + progress.failedPuzzles + ' failed';
    }

    if (progress.error) {
      message = message + ' ? Error: ' + progress.error;
    }

    return message;
  }
}
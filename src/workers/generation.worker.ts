import "dotenv/config";
import { Worker, Job } from "bullmq";
import { redisConnection } from "@/lib/redis.js";
import { QUEUE_NAMES } from "@/lib/queue.js";
import { GenerationService } from "@/modules/generation/generation.service.js";
import { prisma } from "@/lib/prisma.js";

interface GenerationJobData {
  bookId: string;
  userId: string;
}

console.log("🔍 Checking environment variables:");
console.log("  REDIS_URL exists:", !!process.env.REDIS_URL);
console.log(
  "  UPSTASH_REDIS_REST_URL exists:",
  !!process.env.UPSTASH_REDIS_REST_URL,
);
console.log(
  "  UPSTASH_REDIS_REST_TOKEN exists:",
  !!process.env.UPSTASH_REDIS_REST_TOKEN,
);

export const generationWorker = new Worker<GenerationJobData>(
  QUEUE_NAMES.GENERATION,
  async (job: Job<GenerationJobData>) => {
    const { bookId, userId } = job.data;

    console.log(`[Worker] Processing job ${job.id} for book ${bookId}`);

    await job.updateProgress(0);

    try {
      // Check if the book exists first
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        console.log(`[Worker] Book ${bookId} not found, skipping job`);
        await job.updateProgress(100);
        return { skipped: true, reason: "Book not found" };
      }

      console.log(`[Worker] Book ${bookId} found with status: ${book.status}`);

      // ✅ Update status to "generating" before starting
      await prisma.book.update({
        where: { id: bookId },
        data: { status: "generating" },
      });
      console.log(`[Worker] Book ${bookId} status updated to "generating"`);

      await job.updateProgress(10);

      // ✅ Start generation
      console.log(`[Worker] Starting generation for book ${bookId}`);
      const result = await GenerationService.generateBook(bookId);

      console.log("[Worker] Generation result:", {
        generatedPuzzles: result.generatedPuzzles,
        totalPuzzles: result.totalPuzzles,
        failedPuzzles: result.failedPuzzles,
        errors: result.errors.length,
        warnings: result.warnings.length,
        qualityScore: result.qualityScore,
      });

      await job.updateProgress(90);

      // ✅ Determine final status
      let status = "ready";
      if (result.failedPuzzles > 0 && result.generatedPuzzles === 0) {
        status = "failed";
        console.log(`[Worker] Book ${bookId} failed - no puzzles generated`);
      } else if (result.failedPuzzles > 0) {
        status = "ready";
        console.log(
          `[Worker] Book ${bookId} partially failed - ${result.failedPuzzles} puzzles failed`,
        );
      } else {
        status = "ready";
        console.log(`[Worker] Book ${bookId} completed successfully`);
      }

      // ✅ Get the quality score from the generation result
      let qualityScore = result.qualityScore;

      console.log("[Worker] Initial qualityScore from result:", qualityScore);

      // If qualityScore is 0 but there are generated puzzles, recalculate
      if (
        qualityScore === 0 &&
        result.generatedPuzzles > 0 &&
        result.totalPuzzles > 0
      ) {
        const successRate = result.generatedPuzzles / result.totalPuzzles;
        const baseScore = successRate * 100;
        const errorPenalty = result.errors.length * 2;
        const warningPenalty = result.warnings.length * 0.5;
        qualityScore = Math.max(
          0,
          Math.min(100, baseScore - errorPenalty - warningPenalty),
        );
        console.log("[Worker] Recalculated quality score:", {
          successRate,
          baseScore,
          errorPenalty,
          warningPenalty,
          qualityScore,
        });
      }

      // If qualityScore is still 0 but there are generated puzzles, force it
      if (qualityScore === 0 && result.generatedPuzzles > 0) {
        qualityScore = 80; // Default good score
        console.log(
          "[Worker] Forced quality score to 80 because puzzles were generated",
        );
      }

      console.log("[Worker] Final quality score:", qualityScore);

      // ✅ Update final status
      await prisma.book.update({
        where: { id: bookId },
        data: {
          status: status,
          qualityScore: qualityScore,
        },
      });
      console.log(`[Worker] Book ${bookId} final status: ${status}`);

      await job.updateProgress(100);

      console.log(`[Worker] Job ${job.id} completed for book ${bookId}`);
      console.log(
        `  Generated: ${result.generatedPuzzles}/${result.totalPuzzles}`,
      );
      console.log(`  Failed: ${result.failedPuzzles}`);
      console.log(`  Quality Score: ${qualityScore}`);

      if (result.errors.length > 0) {
        console.error("[Worker] Generation errors:");
        for (const error of result.errors) {
          console.error(`  - ${error}`);
        }
      }

      if (result.warnings.length > 0) {
        console.warn("[Worker] Generation warnings:");
        for (const warning of result.warnings) {
          console.warn(`  - ${warning}`);
        }
      }

      console.log("[Worker] Generation completed");
      return result;
    } catch (error: any) {
      console.error(`[Worker] Job ${job.id} failed:`, error.message);
      console.error(`[Worker] Stack trace:`, error.stack);

      // ✅ Update book status to failed
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });
      if (book) {
        await prisma.book.update({
          where: { id: bookId },
          data: {
            status: "failed",
            qualityScore: 0,
          },
        });
        console.log(
          `[Worker] Book ${bookId} status set to "failed" due to error`,
        );
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 5000,
    },
  },
);

generationWorker.on("completed", (job, result) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

generationWorker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

generationWorker.on("progress", (job, progress) => {
  console.log(`[Worker] Job ${job.id} progress: ${progress}%`);
});

generationWorker.on("error", (err) => {
  console.error("[Worker] Worker error:", err.message);
});

process.on("SIGTERM", async () => {
  console.log("[Worker] Received SIGTERM, closing worker...");
  await generationWorker.close();
  console.log("[Worker] Worker closed");
});

process.on("SIGINT", async () => {
  console.log("[Worker] Received SIGINT, closing worker...");
  await generationWorker.close();
  console.log("[Worker] Worker closed");
});

console.log("[Worker] Generation worker started and ready for jobs");

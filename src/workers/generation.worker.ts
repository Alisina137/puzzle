import "dotenv/config";
import { Worker, Job } from "bullmq";
import { redisConnection } from "@/lib/redis.js";
import { QUEUE_NAMES } from "@/lib/queue.js";
import { GenerationService } from "@/modules/generation/generation.service.js";
import { prisma } from "@/lib/prisma.js";

// Job data interface
interface GenerationJobData {
  bookId: string;
  userId: string;
}

console.log("?? Checking environment variables:");
console.log("  REDIS_URL exists:", !!process.env.REDIS_URL);
console.log(
  "  UPSTASH_REDIS_REST_URL exists:",
  !!process.env.UPSTASH_REDIS_REST_URL,
);
console.log(
  "  UPSTASH_REDIS_REST_TOKEN exists:",
  !!process.env.UPSTASH_REDIS_REST_TOKEN,
);

// Create the generation worker
export const generationWorker = new Worker<GenerationJobData>(
  QUEUE_NAMES.GENERATION,
  async (job: Job<GenerationJobData>) => {
    const { bookId, userId } = job.data;

    console.log("[Worker] Processing job " + job.id + " for book " + bookId);

    await job.updateProgress(0);

    try {
      await prisma.book.update({
        where: { id: bookId },
        data: { status: "generating" },
      });

      await job.updateProgress(10);

      const result = await GenerationService.generateBook(bookId);

      await job.updateProgress(90);

      let status = "ready";
      if (result.failedPuzzles > 0 && result.generatedPuzzles === 0) {
        status = "failed";
      } else if (result.failedPuzzles > 0) {
        status = "ready";
      }

      await prisma.book.update({
        where: { id: bookId },
        data: {
          status: status,
          qualityScore: 0,
        },
      });

      await job.updateProgress(100);

      console.log("[Worker] Job " + job.id + " completed for book " + bookId);
      console.log(
        "  Generated: " + result.generatedPuzzles + "/" + result.totalPuzzles,
      );
      console.log("  Failed: " + result.failedPuzzles);
      console.log("[Worker] Generation completed successfully");

      return result;
    } catch (error: any) {
      console.error("[Worker] Job " + job.id + " failed:", error.message);

      await prisma.book.update({
        where: { id: bookId },
        data: { status: "failed" },
      });

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
  console.log("[Worker] Job " + job.id + " completed successfully");
});

generationWorker.on("failed", (job, err) => {
  console.error("[Worker] Job " + job?.id + " failed:", err.message);
});

generationWorker.on("progress", (job, progress) => {
  console.log("[Worker] Job " + job.id + " progress: " + progress + "%");
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

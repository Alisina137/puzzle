import { Queue, Worker, Job } from "bullmq";
import { redisConnection, isRedisConfigured } from "@/lib/redis";

// Define queue names
export const QUEUE_NAMES = {
  GENERATION: "puzzle-generation",
  EXPORT: "puzzle-export",
} as const;

// Check if Redis is configured
if (!isRedisConfigured()) {
  console.warn("?? Redis is not configured. Queue features will not work.");
  console.warn(
    "Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN or REDIS_URL in .env",
  );
}

// Create generation queue
export const generationQueue = new Queue(QUEUE_NAMES.GENERATION, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 604800, // 7 days
      count: 50,
    },
  },
});

// Create export queue (for future use)
export const exportQueue = new Queue(QUEUE_NAMES.EXPORT, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      age: 86400,
      count: 100,
    },
    removeOnFail: {
      age: 604800,
      count: 50,
    },
  },
});

// Get queue status
export async function getQueueStatus(queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const queue =
    queueName === QUEUE_NAMES.GENERATION ? generationQueue : exportQueue;
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);
  return { waiting, active, completed, failed };
}

// Clean up old jobs
export async function cleanQueue(
  queueName: string,
  age: number = 86400,
): Promise<void> {
  const queue =
    queueName === QUEUE_NAMES.GENERATION ? generationQueue : exportQueue;
  await queue.clean(age * 1000, 1000, "completed");
  await queue.clean(age * 1000, 1000, "failed");
}

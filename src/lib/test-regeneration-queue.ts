import "dotenv/config";
import { regenerationQueue } from "@/lib/queue";

async function main() {
  const waiting = await regenerationQueue.getWaitingCount();
  const active = await regenerationQueue.getActiveCount();
  const completed = await regenerationQueue.getCompletedCount();
  const failed = await regenerationQueue.getFailedCount();

  console.log("=== REGENERATION QUEUE ===");
  console.log("Waiting:", waiting);
  console.log("Active:", active);
  console.log("Completed:", completed);
  console.log("Failed:", failed);

  const jobs = await regenerationQueue.getJobs([
    "waiting",
    "active",
    "completed",
    "failed",
  ]);

  for (const job of jobs.slice(0, 10)) {
    console.log({
      id: job.id,
      name: job.name,
      state: await job.getState(),
      data: job.data,
      failedReason: job.failedReason,
    });
  }

  await regenerationQueue.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

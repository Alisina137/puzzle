import { generationQueue } from "./src/lib/queue";

async function checkQueue() {
  try {
    const counts = await generationQueue.getJobCounts();
    console.log("Queue status:", counts);
  } catch (error) {
    console.error("Error checking queue:", error);
  }
}

checkQueue();

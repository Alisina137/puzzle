import { generationQueue } from "./src/lib/queue";

async function clearQueue() {
  try {
    await generationQueue.obliterate({ force: true });
    console.log("Queue cleared successfully");
  } catch (error) {
    console.error("Error clearing queue:", error);
  }
}

clearQueue();

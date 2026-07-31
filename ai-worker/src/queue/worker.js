const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const { runFixerAgent } = require("../agents/fixerAgent");
const { runRagAgent } = require("../agents/ragAgent");

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "git-mind-jobs",
  async (job) => {
    if (job.name === "fix-code") {
      return runFixerAgent(job.data);
    }

    if (job.name === "rag-query") {
      return runRagAgent(job.data);
    }

    return { skipped: true };
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`[ai-worker] job completed: ${job.id} (${job.name})`);
});

worker.on("failed", (job, error) => {
  console.error(`[ai-worker] job failed: ${job?.id}`, error);
});

console.log("[ai-worker] listening for jobs on queue git-mind-jobs");

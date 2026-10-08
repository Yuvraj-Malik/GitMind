require("../config");
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const { QUEUE_NAME } = require("shared");
const { processFixJob } = require("../jobs/fixJob");
const { ensureDb } = require("../services/db");
const { closePublisher } = require("../services/events");

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
connection.on("error", (err) => console.warn("[ai-worker] redis warning:", err.message));

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`[ai-worker] picked up job ${job.id} (${job.name})`);
    if (job.name === "fix-code") return processFixJob(job);
    if (job.name === "rag-query") {
      const { runRagAgent } = require("../agents/ragAgent");
      return runRagAgent(job.data);
    }
    return { skipped: true };
  },
  {
    connection,
    // One fix at a time: jobs share git working trees.
    concurrency: 1,
    lockDuration: 10 * 60 * 1000,
  }
);

worker.on("completed", (job, result) => {
  console.log(`[ai-worker] job ${job.id} done: ok=${result?.ok} ${result?.prUrl || result?.failed_at || ""}`);
});
worker.on("failed", (job, error) => {
  console.error(`[ai-worker] job ${job?.id} crashed:`, error.message);
});

ensureDb().catch(() => {});
console.log(`[ai-worker] listening for jobs on queue ${QUEUE_NAME}`);

async function shutdown() {
  console.log("[ai-worker] shutting down...");
  await worker.close();
  await closePublisher();
  await connection.quit().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

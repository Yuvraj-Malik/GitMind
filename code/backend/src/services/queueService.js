const { Queue } = require("bullmq");
const { QUEUE_NAME, fixJobId } = require("shared");
const { redisConnection } = require("../config/redis");

let jobsQueue = null;
function getQueue() {
  if (!jobsQueue) {
    jobsQueue = new Queue(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 1, // the fixer already retries internally; never re-run a job that may have pushed
        removeOnComplete: { age: 24 * 3600, count: 500 }, // keep 24h => dedupe window
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });
  }
  return jobsQueue;
}

/**
 * Enqueue a webhook-triggered fix. Idempotent per repo+commit: a second event for the
 * same head SHA returns the existing job instead of starting another run.
 */
async function createWebhookFixJob(payload) {
  const queue = getQueue();
  const jobId = fixJobId(payload.repoFullName, payload.headSha);
  const existing = await queue.getJob(jobId);
  if (existing) {
    return { job: existing, deduped: true };
  }
  const job = await queue.add("fix-code", { ...payload, trigger: "webhook" }, { jobId });
  return { job, deduped: false };
}

/** Manual trigger from the dashboard (fixture / sandbox mode). */
async function createManualFixJob(payload) {
  const job = await getQueue().add("fix-code", { ...payload, trigger: "manual" });
  return { job, deduped: false };
}

async function getJobStatus(jobId) {
  const job = await getQueue().getJob(jobId);
  if (!job) return null;
  return {
    id: job.id,
    name: job.name,
    state: await job.getState(),
    result: job.returnvalue || null,
    failedReason: job.failedReason || null,
    createdAt: job.timestamp,
    finishedAt: job.finishedOn || null,
  };
}

async function createRagQueryJob(payload) {
  return getQueue().add("rag-query", payload);
}

module.exports = { createWebhookFixJob, createManualFixJob, getJobStatus, createRagQueryJob, getQueue };

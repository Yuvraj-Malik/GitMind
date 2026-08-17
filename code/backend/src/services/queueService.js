const { Queue } = require("bullmq");
const { redisConnection } = require("../config/redis");

const jobsQueue = new Queue("git-mind-jobs", { connection: redisConnection });

async function createFixCodeJob(payload) {
  return jobsQueue.add("fix-code", payload);
}

async function createRagQueryJob(payload) {
  return jobsQueue.add("rag-query", payload);
}

module.exports = { createFixCodeJob, createRagQueryJob };

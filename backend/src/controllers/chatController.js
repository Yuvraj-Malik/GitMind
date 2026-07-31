const { createRagQueryJob } = require("../services/queueService");

async function postChat(req, res) {
  const { question, repositoryId } = req.body;
  const job = await createRagQueryJob({ question, repositoryId });
  res.status(202).json({ queued: true, jobId: job.id });
}

module.exports = { postChat };

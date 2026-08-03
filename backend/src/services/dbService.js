const Repository = require("../models/Repository");
const PullRequest = require("../models/PullRequest");
const AILog = require("../models/AILog");

async function listRepositories() {
  return Repository.find().lean();
}

async function listRepoCommits(repositoryId) {
  const repo = await Repository.findById(repositoryId).lean();
  return repo?.commits || [];
}

async function upsertPullRequestStatus(number, status) {
  if (!number) return null;
  return PullRequest.findOneAndUpdate(
    { number },
    { number, status, updatedAt: new Date() },
    { upsert: true, new: true }
  );
}

async function listPullRequests(repositoryId) {
  const filter = repositoryId ? { repositoryId } : {};
  return PullRequest.find(filter).sort({ updatedAt: -1 }).lean();
}

async function listBranches(repositoryId) {
  const repositories = repositoryId
    ? await Repository.find({ _id: repositoryId }).lean()
    : await Repository.find().lean();

  return repositories.flatMap((repository) => {
    const branches = new Map();
    for (const commit of repository.commits || []) {
      const name = commit?.branch;
      if (!name) continue;
      const updatedAt = commit?.updatedAt || commit?.createdAt || repository.updatedAt;
      if (!branches.has(name) || new Date(updatedAt) > new Date(branches.get(name).updatedAt)) {
        branches.set(name, { name, updatedAt, commitCount: 0 });
      }
      branches.get(name).commitCount += 1;
    }

    return [...branches.values()].map((branch) => ({
      ...branch,
      repositoryId: String(repository._id),
      repositoryName: repository.name,
    }));
  });
}

async function listActivity() {
  const [pullRequests, logs] = await Promise.all([
    PullRequest.find().sort({ updatedAt: -1 }).limit(50).lean(),
    AILog.find().sort({ updatedAt: -1, createdAt: -1 }).limit(50).lean(),
  ]);

  return [
    ...pullRequests.map((pr) => ({
      id: `pr-${pr._id}`,
      type: "pull_request",
      title: `Pull request #${pr.number} ${pr.status || "updated"}`,
      status: pr.status,
      createdAt: pr.updatedAt || pr.createdAt,
      repositoryId: pr.repositoryId ? String(pr.repositoryId) : null,
    })),
    ...logs.map((log) => ({
      id: `ai-${log._id}`,
      type: "ai",
      title: log.action || "AI job updated",
      status: log.status,
      detail: log.reasoning,
      createdAt: log.updatedAt || log.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function listAiLogs() {
  return AILog.find().sort({ updatedAt: -1, createdAt: -1 }).limit(100).lean();
}

async function createAiLog({ jobId, action, reasoning, status }) {
  return AILog.create({ jobId, action, reasoning, status });
}

module.exports = {
  listRepositories,
  listRepoCommits,
  listPullRequests,
  listBranches,
  listActivity,
  listAiLogs,
  createAiLog,
  upsertPullRequestStatus,
};

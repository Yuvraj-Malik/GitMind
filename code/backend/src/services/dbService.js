const { Repository, PullRequest, AILog } = require("shared");

async function listRepositories() {
  return Repository.find().lean();
}

async function listRepoCommits(repositoryId) {
  const repo = await Repository.findById(repositoryId).lean();
  return repo?.commits || [];
}

async function upsertPullRequestStatus(number, status, repositoryId) {
  if (!number || !repositoryId) return null;
  return PullRequest.findOneAndUpdate(
    { repositoryId, number },
    { repositoryId, number, status, updatedAt: new Date() },
    { upsert: true, returnDocument: "after" }
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
    if (Array.isArray(repository.branches) && repository.branches.length > 0) {
      return repository.branches.map((b) => ({
        name: typeof b === "string" ? b : b.name,
        isDefault: Boolean(b.isDefault),
        protected: Boolean(b.protected),
        aheadBy: b.aheadBy ?? null,
        commitCount: b.commitCount ?? null,
        lastAuthor: b.lastAuthor || null,
        commitSha: b.commitSha || null,
        updatedAt: b.updatedAt || null,
        repositoryId: String(repository._id),
        repositoryName: repository.name,
        repositoryOwner: repository.owner,
      }));
    }

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

async function listActivity(repositoryIds) {
  const prFilter = repositoryIds ? { repositoryId: { $in: repositoryIds } } : {};
  const logFilter = repositoryIds ? { $or: [{ repositoryId: { $in: repositoryIds } }, { repoName: "sandbox" }] } : {};
  const [pullRequests, logs] = await Promise.all([
    PullRequest.find(prFilter).sort({ updatedAt: -1 }).limit(50).lean(),
    AILog.find(logFilter).sort({ updatedAt: -1, createdAt: -1 }).limit(50).lean(),
  ]);

  return [
    ...pullRequests.map((pr) => ({
      id: `pr-${pr._id}`,
      type: "pull_request",
      title: `PR #${pr.number} ${pr.status || "updated"}${pr.title ? `: ${pr.title}` : ""}`,
      link: pr.url,
      status: pr.status,
      createdAt: pr.updatedAt || pr.createdAt,
      repositoryId: pr.repositoryId ? String(pr.repositoryId) : null,
    })),
    ...logs.map((log) => ({
      id: `ai-${log._id}`,
      type: "ai",
      title: `${log.action || "AI fix"}${log.filePath ? ` · ${log.filePath}` : ""}`,
      status: log.status,
      detail: log.reasoning,
      link: log.prUrl || null,
      createdAt: log.updatedAt || log.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function listAiLogs(filter = {}) {
  return AILog.find(filter).sort({ updatedAt: -1, createdAt: -1 }).limit(100).lean();
}

async function createAiLog(fields) {
  return AILog.create(fields);
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

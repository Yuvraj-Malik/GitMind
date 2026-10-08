const path = require("path");
const mongoose = require("mongoose");
const { Repository, PullRequest, SOCKET_EVENTS } = require("shared");
const gh = require("../services/githubService");
const { createManualFixJob, getJobStatus } = require("../services/queueService");
const { createAiLog, listBranches } = require("../services/dbService");
const { emitEvent } = require("../sockets/socketManager");

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Loads a repo connected by the current user, or throws 404. */
async function ownedRepo(req, id = req.params.id) {
  if (!mongoose.isValidObjectId(id)) throw new gh.HttpError(404, "Repository not found");
  const repo = await Repository.findOne({ _id: id, connectedBy: req.user.id });
  if (!repo) throw new gh.HttpError(404, "Repository not found or not connected by you");
  return repo;
}

const summary = (r) => ({
  id: String(r._id),
  fullName: r.fullName || `${r.owner}/${r.name}`,
  name: r.name,
  owner: r.owner,
  url: r.url,
  private: r.private,
  defaultBranch: r.defaultBranch,
  webhookStatus: r.webhookStatus || "not_configured",
  webhookError: r.webhookError || null,
  lastSyncedAt: r.lastSyncedAt || null,
  syncError: r.syncError || null,
  branchCount: r.branches?.length || 0,
  commitCount: r.commits?.length || 0,
});

// ----- Connected repositories -----
const listConnected = wrap(async (req, res) => {
  const repos = await Repository.find({ connectedBy: req.user.id }).sort({ updatedAt: -1 }).lean();
  res.json(repos.map(summary));
});

const listGithubRepos = wrap(async (req, res) => {
  const [repos, connected] = await Promise.all([
    gh.listUserGithubRepos(req.user.id),
    Repository.find({ connectedBy: req.user.id }).select("fullNameLower").lean(),
  ]);
  const set = new Map(connected.map((c) => [c.fullNameLower, String(c._id)]));
  res.json(repos.map((r) => ({ ...r, connectedId: set.get(r.fullName.toLowerCase()) || null })));
});

const connect = wrap(async (req, res) => {
  const repo = await gh.connectRepository(req.user.id, req.body?.fullName);
  res.status(201).json(summary(repo));
});

const disconnect = wrap(async (req, res) => {
  const repo = await ownedRepo(req);
  await gh.disconnectRepository(repo);
  res.json({ ok: true });
});

const getRepo = wrap(async (req, res) => {
  const repo = await ownedRepo(req);
  res.json({ ...summary(repo), commits: repo.commits || [] });
});

const sync = wrap(async (req, res) => {
  const repo = await ownedRepo(req);
  const result = await gh.syncRepository(repo);
  res.json(result);
});

const retryWebhook = wrap(async (req, res) => {
  const repo = await ownedRepo(req);
  const octokit = await gh.userOctokit(req.user.id);
  await gh.ensureWebhook(repo, octokit);
  await repo.save();
  res.json(summary(repo));
});

const commits = wrap(async (req, res) => {
  const repo = await ownedRepo(req);
  res.json(repo.commits || []);
});

const pullRequests = wrap(async (req, res) => {
  const repo = await ownedRepo(req);
  res.json(await PullRequest.find({ repositoryId: repo._id }).sort({ updatedAt: -1 }).lean());
});

const branches = wrap(async (req, res) => {
  const repo = await ownedRepo(req);
  res.json(await listBranches(repo._id));
});

const merge = wrap(async (req, res) => {
  const repo = await ownedRepo(req);
  res.json(await gh.mergePullRequest(repo, req.params.number));
});

const removeBranch = wrap(async (req, res) => {
  const repo = await ownedRepo(req);
  res.json(await gh.deleteBranch(repo, req.body?.name));
});

/**
 * POST /repos/:id/trigger-fix
 *  - id = "sandbox": { filePath: "bugs/x.js" } fixes a file in the local sandbox (TEST_REPO_PATH)
 *  - id = <repo id>: { branch? } clones the repo at the branch head, runs its tests, fixes what fails
 */
const triggerFix = wrap(async (req, res) => {
  if (req.params.id === "sandbox") {
    const { filePath } = req.body || {};
    if (!filePath || typeof filePath !== "string") throw new gh.HttpError(400, "Missing filePath");
    const basename = path.basename(filePath.replace(/^bugs[\\/]/, ""));
    if (!/^[\w.-]+\.js$/.test(basename) || /\.test\.js$/.test(basename)) throw new gh.HttpError(400, "filePath must be a non-test .js file in bugs/");
    const rel = `bugs/${basename}`;
    const { job } = await createManualFixJob({ relativeFile: rel, requestedBy: req.user.username });
    await createAiLog({ jobId: job.id, trigger: "manual", action: "Fix workflow queued", reasoning: `Manual sandbox fix for ${rel} by ${req.user.username}.`, status: "queued", filePath: rel, repoName: "sandbox" });
    emitEvent(SOCKET_EVENTS.AI_FIX_STARTED, { jobId: job.id, filePath: rel });
    return res.status(202).json({ ok: true, jobId: job.id });
  }

  const repo = await ownedRepo(req);
  const branch = req.body?.branch || repo.defaultBranch;
  const b = (repo.branches || []).find((x) => x.name === branch);
  if (!b?.commitSha) throw new gh.HttpError(400, `Branch ${branch} not found. Sync the repository first.`);
  const { job } = await createManualFixJob({
    repositoryId: String(repo._id),
    repoFullName: repo.fullName,
    headSha: b.commitSha,
    headBranch: branch,
    baseBranch: branch,
    requestedBy: req.user.username,
  });
  await createAiLog({ jobId: job.id, trigger: "manual", action: "Fix workflow queued", reasoning: `Manual run on ${repo.fullName}@${branch} by ${req.user.username}.`, status: "queued", repoName: repo.fullName, repositoryId: repo._id, headSha: b.commitSha, baseBranch: branch });
  emitEvent(SOCKET_EVENTS.AI_FIX_STARTED, { jobId: job.id, repoName: repo.fullName, repositoryId: String(repo._id) });
  res.status(202).json({ ok: true, jobId: job.id });
});

const getJob = wrap(async (req, res) => {
  const status = await getJobStatus(req.params.jobId);
  if (!status) throw new gh.HttpError(404, "Job not found");
  res.json(status);
});

module.exports = {
  ownedRepo, listConnected, listGithubRepos, connect, disconnect, getRepo, sync, retryWebhook,
  commits, pullRequests, branches, merge, removeBranch, triggerFix, getJob,
};

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { AILog, PullRequest, Repository, User, AI_FIX_BRANCH_PREFIX } = require("shared");
const env = require("../config/env");
const { redisConnection } = require("../config/redis");
const { getQueue } = require("../services/queueService");
const { listNotifications, markRead } = require("../services/notificationService");
const { webhookUrl } = require("../services/githubService");
const { userRepoIds } = require("./workspaceController");


async function withTimeout(promise, ms = 3000) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

async function checkGithub(userId) {
  try {
    const { tokenInfo } = require("../services/githubService");
    const info = await withTimeout(tokenInfo(userId), 6000);
    const needed = ["repo", "admin:repo_hook"];
    const missing = needed.filter((n) => !info.scopes.includes(n));
    return missing.length
      ? { ok: false, detail: `Signed in as ${info.login}, but missing permission: ${missing.join(", ")}. Sign out and sign in again.` }
      : { ok: true, detail: `Signed in as ${info.login} (${info.scopes.join(", ")})` };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
}

async function getSystemStatus(req, res) {
  const mongoOk = mongoose.connection.readyState === 1;
  let redis = { ok: false, detail: "unreachable" };
  let worker = { ok: false, detail: "no worker connected" };
  let queue = null;
  try {
    if (redisConnection.status === "wait") await withTimeout(redisConnection.connect());
    await withTimeout(redisConnection.ping());
    redis = { ok: true, detail: "connected" };
    const q = getQueue();
    const [workers, counts] = await Promise.all([withTimeout(q.getWorkers()), withTimeout(q.getJobCounts("waiting", "active", "completed", "failed"))]);
    worker = workers.length ? { ok: true, detail: `${workers.length} worker process${workers.length > 1 ? "es" : ""} online` } : { ok: false, detail: "start it with: npm run start:worker" };
    queue = counts;
  } catch (err) {
    redis = { ok: false, detail: err.message };
  }
  const sandbox = process.env.TEST_REPO_PATH;
  res.json({
    services: {
      api: { ok: true, detail: `up ${Math.floor(process.uptime())}s` },
      database: { ok: mongoOk, detail: mongoOk ? "connected" : "disconnected" },
      redis,
      worker,
      github: await checkGithub(req.user.id),
      publicUrl: webhookUrl() ? { ok: true, detail: webhookUrl() } : { ok: false, detail: "PUBLIC_WEBHOOK_URL not set: CI-triggered fixes are off (manual runs still work)" },
      llm: { ok: Boolean(process.env.GEMINI_API_KEY), detail: process.env.GEMINI_API_KEY ? process.env.FIX_MODEL || "gemini-2.5-flash" : "GEMINI_API_KEY not set" },
      webhook: { ok: Boolean(env.githubWebhookSecret), detail: env.githubWebhookSecret ? "secret configured" : "GITHUB_WEBHOOK_SECRET not set" },
      sandbox: !require("../middleware/auth").isAdmin(req.user) ? undefined : { ok: Boolean(sandbox && fs.existsSync(sandbox)), detail: sandbox ? (fs.existsSync(sandbox) ? "found" : "path does not exist") : "TEST_REPO_PATH not set" },
    },
    queue,
    connectedRepos: (await Repository.find({ connectedBy: req.user.id }).select("fullName webhookStatus").lean()).map((r) => ({ fullName: r.fullName, webhookStatus: r.webhookStatus })),
  });
}

async function getOverview(req, res, next) {
  try {
    const ids = await userRepoIds(req);
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const logScope = { repositoryId: { $in: ids } };
    const [repo, openPrs, aiOpenPrs, totalRuns, successRuns, failedRuns, weekRuns, lastRun, durations] = await Promise.all([
      req.query.repositoryId && ids.length ? Repository.findById(ids[0]).select("-commits").lean() : null,
      PullRequest.countDocuments({ repositoryId: { $in: ids }, status: "open" }),
      PullRequest.countDocuments({ repositoryId: { $in: ids }, status: "open", branch: { $regex: `^${AI_FIX_BRANCH_PREFIX}` } }),
      AILog.countDocuments({ ...logScope, status: { $in: ["success", "failed"] } }),
      AILog.countDocuments({ ...logScope, status: "success" }),
      AILog.countDocuments({ ...logScope, status: "failed" }),
      AILog.countDocuments({ ...logScope, createdAt: { $gte: since } }),
      AILog.findOne({ ...logScope, status: { $in: ["success", "failed", "skipped"] } }).sort({ updatedAt: -1 }).lean(),
      AILog.find({ ...logScope, durationMs: { $gt: 0 } }).sort({ createdAt: -1 }).limit(50).select("durationMs").lean(),
    ]);
    const avgMs = durations.length ? Math.round(durations.reduce((s, d) => s + d.durationMs, 0) / durations.length) : null;
    res.json({
      repository: repo ? { id: String(repo._id), name: repo.name, owner: repo.owner, fullName: repo.fullName, url: repo.url, lastSyncedAt: repo.lastSyncedAt, syncError: repo.syncError, webhookStatus: repo.webhookStatus, branchCount: repo.branches?.length || 0 } : null,
      connectedRepos: ids.length,
      pullRequests: { open: openPrs, aiOpen: aiOpenPrs },
      aiRuns: { total: totalRuns, success: successRuns, failed: failedRuns, last7Days: weekRuns, successRate: totalRuns ? successRuns / totalRuns : null, avgDurationMs: avgMs, last: lastRun },
    });
  } catch (err) {
    next(err);
  }
}

/** Fixable files in the sandbox (bugs/*.js that have a paired test). */
async function getSandboxFiles(req, res) {
  if (!require("../middleware/auth").isAdmin(req.user)) return res.json({ available: false, files: [], detail: "Owner only" });
  const dir = process.env.TEST_REPO_PATH ? path.join(process.env.TEST_REPO_PATH, "bugs") : path.resolve(__dirname, "../../../ai-worker/scripts/test-repo/bugs");
  if (!fs.existsSync(dir)) return res.json({ available: false, files: [], detail: "Sandbox bugs/ folder not found (set TEST_REPO_PATH)" });
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".js") && !f.endsWith(".test.js") && fs.existsSync(path.join(dir, f.replace(/\.js$/, ".test.js"))))
    .sort()
    .map((f) => ({ path: `bugs/${f}`, name: f }));
  res.json({ available: true, files });
}

async function getMe(req, res) {
  const user = req.user?.id ? await User.findById(req.user.id).select("username avatarUrl createdAt").lean().catch(() => null) : null;
  res.json({ id: req.user?.id, username: user?.username || req.user?.username, avatarUrl: user?.avatarUrl || req.user?.avatarUrl || "", memberSince: user?.createdAt || null });
}

async function getNotifications(req, res, next) {
  try { res.json(await listNotifications(req.user.id, Number(req.query.limit) || 30)); } catch (e) { next(e); }
}
async function postNotificationsRead(req, res, next) {
  try { res.json(await markRead(req.user.id, req.body?.ids)); } catch (e) { next(e); }
}

module.exports = { getSystemStatus, getOverview, getSandboxFiles, getMe, getNotifications, postNotificationsRead };

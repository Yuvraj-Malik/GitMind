const { CheckRun, PullRequest, Repository, AILog, isAiFixBranch } = require("shared");

const SWEEP_EVERY_MS = Number(process.env.CI_SWEEP_INTERVAL_MS || 10 * 60 * 1000);
const SWEEP_LOOKBACK_MS = 24 * 3600 * 1000;
const MAX_PRS = 15;

/**
 * Pull the latest CI check runs from GitHub for the default branch and every open PR head.
 * Also records each open PR's head commit (needed to tell "latest" failures from old ones).
 */
async function refreshChecks(repoDoc) {
  const { repoOctokit } = require("./githubService");
  const octokit = await repoOctokit(repoDoc);
  const { owner, name: repo } = repoDoc;

  const { data: prs } = await octokit.rest.pulls.list({ owner, repo, state: "open", per_page: MAX_PRS, sort: "updated", direction: "desc" });
  const refs = [];
  for (const pr of prs) {
    const fromFork = pr.head?.repo?.full_name?.toLowerCase() !== `${owner}/${repo}`.toLowerCase();
    await PullRequest.updateOne(
      { repositoryId: repoDoc._id, number: pr.number },
      { $set: { headSha: pr.head.sha, fromFork, branch: pr.head.ref, baseBranch: pr.base.ref, title: pr.title, url: pr.html_url, author: pr.user?.login || null, status: "open" } },
      { upsert: true }
    );
    refs.push(pr.head.sha);
  }
  const def = (repoDoc.branches || []).find((b) => b.isDefault);
  if (def?.commitSha) refs.push(def.commitSha);

  let count = 0;
  for (const ref of [...new Set(refs)]) {
    try {
      const { data } = await octokit.rest.checks.listForRef({ owner, repo, ref, per_page: 50, filter: "latest" });
      for (const run of data.check_runs) {
        await CheckRun.upsertFromGithub(run, repoDoc._id);
        count++;
      }
    } catch (err) {
      if (err.status !== 404) console.warn(`[ci] checks for ${repoDoc.fullName}@${ref.slice(0, 7)}:`, err.message);
    }
  }
  return { refs: refs.length, checkRuns: count };
}

/** CI state of one commit from its latest run per check name. */
function summarize(runs) {
  const latest = new Map();
  for (const r of runs) {
    const prev = latest.get(r.name);
    if (!prev || new Date(r.startedAt || 0) > new Date(prev.startedAt || 0)) latest.set(r.name, r);
  }
  const list = [...latest.values()];
  if (!list.length) return null;
  const pending = list.filter((r) => r.status !== "completed").length;
  const failed = list.filter((r) => r.status === "completed" && ["failure", "timed_out", "cancelled", "action_required"].includes(r.conclusion)).length;
  const passed = list.filter((r) => r.conclusion === "success").length;
  const starts = list.map((r) => r.startedAt).filter(Boolean).map((d) => new Date(d).getTime());
  const ends = list.map((r) => r.completedAt).filter(Boolean).map((d) => new Date(d).getTime());
  const failing = list.find((r) => r.status === "completed" && r.conclusion === "failure");
  return {
    state: failed ? "failing" : pending ? "pending" : "passing",
    passed,
    failed,
    pending,
    total: list.length,
    durationMs: !pending && starts.length && ends.length ? Math.max(...ends) - Math.min(...starts) : null,
    url: (failing || list[0]).url,
    checks: list.map((r) => ({ name: r.name, status: r.status, conclusion: r.conclusion, durationMs: r.durationMs, url: r.url })),
  };
}

/** Attach a `ci` summary to each PR (by its head commit). */
async function withCi(repositoryId, prs) {
  const shas = prs.map((p) => p.headSha).filter(Boolean);
  if (!shas.length) return prs;
  const runs = await CheckRun.find({ repositoryId, headSha: { $in: shas } }).lean();
  const bySha = new Map();
  for (const r of runs) {
    if (!bySha.has(r.headSha)) bySha.set(r.headSha, []);
    bySha.get(r.headSha).push(r);
  }
  return prs.map((p) => ({ ...p, ci: p.headSha ? summarize(bySha.get(p.headSha) || []) : null }));
}

/** CI statistics over the last 7 days, for the overview page. */
async function ciStats(repositoryIds) {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const runs = await CheckRun.find({ repositoryId: { $in: repositoryIds }, status: "completed", completedAt: { $gte: since } })
    .select("conclusion durationMs completedAt name url headBranch")
    .sort({ completedAt: -1 })
    .lean();
  const decided = runs.filter((r) => ["success", "failure", "timed_out"].includes(r.conclusion));
  const passed = decided.filter((r) => r.conclusion === "success").length;
  const durations = runs.map((r) => r.durationMs).filter((d) => d > 0);
  return {
    runs: runs.length,
    passed,
    failed: decided.length - passed,
    passRate: decided.length ? passed / decided.length : null,
    avgDurationMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    last: runs[0] || null,
  };
}

/**
 * Catch failures a webhook missed (e.g. the free server was asleep): any failed check in the
 * last 24h on the *current* head of an open, same-repo PR that has no fix run yet gets queued.
 * The queue's repo+sha job id makes this safe to run any number of times.
 */
async function sweepMissedFailures(repoDoc) {
  const { enqueueCheckFailure } = require("../webhooks/eventRouter");
  const openPrs = await PullRequest.find({ repositoryId: repoDoc._id, status: "open", fromFork: { $ne: true }, headSha: { $exists: true } }).lean();
  const queued = [];
  for (const pr of openPrs) {
    if (isAiFixBranch(pr.branch)) continue;
    const failed = await CheckRun.findOne({
      repositoryId: repoDoc._id,
      headSha: pr.headSha,
      status: "completed",
      conclusion: "failure",
      completedAt: { $gte: new Date(Date.now() - SWEEP_LOOKBACK_MS) },
    }).lean();
    if (!failed) continue;
    const already = await AILog.exists({ repositoryId: repoDoc._id, headSha: pr.headSha });
    if (already) continue;
    const { job, deduped } = await enqueueCheckFailure(
      {
        repoFullName: repoDoc.fullName,
        headSha: pr.headSha,
        headBranch: pr.branch,
        baseBranch: pr.branch,
        prNumber: pr.number,
        checkName: failed.name,
        checkRunId: failed.githubId,
        recovered: true,
      },
      repoDoc
    );
    if (!deduped) queued.push(job.id);
  }
  if (queued.length) console.log(`[ci] recovered ${queued.length} missed failure(s) on ${repoDoc.fullName}`);
  return queued;
}

/** Periodically refresh CI and recover missed failures for repos with automatic fixing on. */
function startCiSweeper() {
  const run = async () => {
    const filter = process.env.AUTO_FIX_POLLING === "true" ? {} : { webhookStatus: "active" };
    const repos = await Repository.find({ ...filter, connectedBy: { $exists: true } }).select("-commits");
    for (const repo of repos) {
      try {
        await refreshChecks(repo);
        await sweepMissedFailures(repo);
      } catch (err) {
        console.warn(`[ci] sweep of ${repo.fullName} failed:`, err.message);
      }
    }
  };
  setTimeout(() => run().catch(() => {}), 30 * 1000);
  return setInterval(() => run().catch(() => {}), SWEEP_EVERY_MS);
}

module.exports = { refreshChecks, summarize, withCi, ciStats, sweepMissedFailures, startCiSweeper };

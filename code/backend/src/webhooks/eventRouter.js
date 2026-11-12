const { isAiFixBranch, SOCKET_EVENTS, Repository } = require("shared");
const env = require("../config/env");
const { createWebhookFixJob } = require("../services/queueService");
const { createAiLog } = require("../services/dbService");
const { emitToUser } = require("../sockets/socketManager");
const { notify } = require("../services/notificationService");

/**
 * Pure decision function (unit-tested): should this check_run event start a fix?
 * Returns { action: "enqueue", job } or { action: "ignore", reason }.
 */
function decideCheckRun(payload, allowedRepos = env.allowedRepos) {
  const run = payload?.check_run;
  if (payload?.action !== "completed" || !run) return { action: "ignore", reason: "not a completed check_run" };
  if (run.conclusion !== "failure") return { action: "ignore", reason: `conclusion=${run.conclusion}` };

  const repoFullName = payload?.repository?.full_name;
  if (!repoFullName) return { action: "ignore", reason: "missing repository" };
  if (allowedRepos.length > 0 && !allowedRepos.includes(repoFullName.toLowerCase())) {
    return { action: "ignore", reason: `repo ${repoFullName} not in ALLOWED_REPOS` };
  }

  const headBranch = run.check_suite?.head_branch || run.pull_requests?.[0]?.head?.ref;
  if (isAiFixBranch(headBranch)) {
    return { action: "ignore", reason: `self-trigger guard: ${headBranch} is an AI fix branch` };
  }
  if (!headBranch) return { action: "ignore", reason: "no head branch (detached/tag run)" };

  const pr = run.pull_requests?.[0];
  return {
    action: "enqueue",
    job: {
      repoFullName,
      cloneUrl: payload.repository.clone_url,
      headSha: run.head_sha,
      headBranch,
      prNumber: pr?.number || null,
      // The fix PR targets the failing branch, so merging it fixes the original PR.
      baseBranch: headBranch,
      checkName: run.name,
      checkRunId: run.id,
    },
  };
}

/**
 * Queue a fix for a failed check on a connected repo, record it and tell the owner.
 * Shared by the webhook and by the missed-failure sweeper (ciService). Idempotent per repo+sha.
 */
async function enqueueCheckFailure(jobData, repo) {
  const ownerId = repo?.connectedBy ? String(repo.connectedBy) : null;
  const data = { ...jobData, repositoryId: repo ? String(repo._id) : jobData.repositoryId, cloneUrl: jobData.cloneUrl || `https://github.com/${jobData.repoFullName}.git` };
  const { job, deduped } = await createWebhookFixJob(data);
  if (deduped) return { job, deduped };
  await createAiLog({
    jobId: job.id,
    trigger: "webhook",
    action: "Fix workflow queued",
    reasoning: `Check "${data.checkName}" failed on ${data.headBranch}@${String(data.headSha).slice(0, 7)}${data.recovered ? " (recovered after a missed webhook)" : ""}.`,
    status: "queued",
    repoName: data.repoFullName,
    headSha: data.headSha,
    headBranch: data.headBranch,
    baseBranch: data.baseBranch,
    prNumber: data.prNumber,
    repositoryId: repo?._id,
  });
  emitToUser(ownerId, SOCKET_EVENTS.AI_FIX_STARTED, { jobId: job.id, ...data });
  notify({
    userId: ownerId,
    type: "check_failed",
    title: `CI failed on ${data.headBranch}`,
    body: `"${data.checkName}" failed${data.prNumber ? ` on PR #${data.prNumber}` : ""}. Git-Mind queued a fix.`,
    link: "/ai",
    jobId: job.id,
  });
  return { job, deduped: false };
}

async function routeGithubEvent(req, res) {
  const event = req.get("x-github-event");
  const payload = req.body;

  try {
    if (event === "ping") return res.status(200).json({ ok: true, pong: true });

    const fullName = payload?.repository?.full_name || "";
    const connected = fullName ? await Repository.findOne({ fullNameLower: fullName.toLowerCase() }).select("_id fullName fullNameLower connectedBy").lean() : null;
    const ownerId = connected?.connectedBy ? String(connected.connectedBy) : null;

    if (event === "check_run") {
      // Record every CI run of a connected repo for the dashboard, whatever its outcome.
      if (connected && payload.check_run) {
        const { CheckRun } = require("shared");
        await CheckRun.upsertFromGithub(payload.check_run, connected._id);
        emitToUser(ownerId, SOCKET_EVENTS.CI_UPDATED, { repositoryId: String(connected._id), name: payload.check_run.name, status: payload.check_run.status, conclusion: payload.check_run.conclusion });
      }
      // Act on repos connected in the app (plus any listed in ALLOWED_REPOS for the sandbox setup).
      const allowed = connected ? [connected.fullNameLower] : env.allowedRepos.length ? env.allowedRepos : ["__none__"];
      const decision = decideCheckRun(payload, allowed);
      if (decision.action === "ignore") {
        return res.status(202).json({ ok: true, ignored: decision.reason });
      }
      const { job, deduped } = await enqueueCheckFailure(decision.job, connected);
      return res.status(202).json({ ok: true, jobId: job.id, ...(deduped ? { deduped: true } : {}) });
    }

    if (event === "pull_request") {
      const pr = payload?.pull_request || {};
      const status = pr.merged ? "merged" : pr.state === "closed" ? "closed" : "open";
      if (connected) {
        const { PullRequest } = require("shared");
        const fromFork = pr.head?.repo?.full_name?.toLowerCase() !== String(connected.fullName || "").toLowerCase();
        await PullRequest.findOneAndUpdate(
          { repositoryId: connected._id, number: payload.number },
          { repositoryId: connected._id, number: payload.number, status, title: pr.title, branch: pr.head?.ref, baseBranch: pr.base?.ref, headSha: pr.head?.sha, fromFork, author: pr.user?.login, url: pr.html_url },
          { upsert: true }
        );
      }
      if (status === "merged" && payload.action === "closed") {
        notify({ userId: ownerId, type: "pr_merged", title: `PR #${payload.number} merged`, body: pr.title || "", link: pr.html_url });
      }
      return res.status(202).json({ ok: true });
    }

    return res.status(202).json({ ok: true, ignored: `event ${event}` });
  } catch (error) {
    console.error("[webhook] failed to route event", error);
    return res.status(500).json({ ok: false, error: "Webhook processing failed" });
  }
}

module.exports = { routeGithubEvent, decideCheckRun, enqueueCheckFailure };

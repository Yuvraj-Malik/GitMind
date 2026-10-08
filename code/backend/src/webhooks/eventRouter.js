const { isAiFixBranch, SOCKET_EVENTS, Repository } = require("shared");
const env = require("../config/env");
const { createWebhookFixJob } = require("../services/queueService");
const { createAiLog } = require("../services/dbService");
const { emitEvent } = require("../sockets/socketManager");
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

async function routeGithubEvent(req, res) {
  const event = req.get("x-github-event");
  const payload = req.body;

  try {
    if (event === "ping") return res.status(200).json({ ok: true, pong: true });

    const fullName = payload?.repository?.full_name || "";
    const connected = fullName ? await Repository.findOne({ fullNameLower: fullName.toLowerCase() }).select("_id fullNameLower").lean() : null;

    if (event === "check_run") {
      // Act on repos connected in the app (plus any listed in ALLOWED_REPOS for the sandbox setup).
      const allowed = connected ? [connected.fullNameLower] : env.allowedRepos.length ? env.allowedRepos : ["__none__"];
      const decision = decideCheckRun(payload, allowed);
      if (decision.job && connected) decision.job.repositoryId = String(connected._id);
      if (decision.action === "ignore") {
        return res.status(202).json({ ok: true, ignored: decision.reason });
      }
      const { job, deduped } = await createWebhookFixJob(decision.job);
      if (deduped) {
        return res.status(202).json({ ok: true, deduped: true, jobId: job.id });
      }
      
      await createAiLog({
        jobId: job.id,
        trigger: "webhook",
        action: "Fix workflow queued",
        reasoning: `Check "${decision.job.checkName}" failed on ${decision.job.headBranch}@${String(decision.job.headSha).slice(0, 7)}.`,
        status: "queued",
        repoName: decision.job.repoFullName,
        headSha: decision.job.headSha,
        prNumber: decision.job.prNumber,
        repositoryId: connected?._id,
      });
      emitEvent(SOCKET_EVENTS.AI_FIX_STARTED, { jobId: job.id, ...decision.job });
      notify({
        type: "check_failed",
        title: `CI failed on ${decision.job.headBranch}`,
        body: `"${decision.job.checkName}" failed${decision.job.prNumber ? ` on PR #${decision.job.prNumber}` : ""}. Git-Mind queued a fix.`,
        link: "/ai",
        jobId: job.id,
      });
      return res.status(202).json({ ok: true, jobId: job.id });
    }

    if (event === "pull_request") {
      const status = payload?.pull_request?.merged ? "merged" : payload?.action || "updated";
      if (connected) {
        const pr = payload?.pull_request || {};
        const { PullRequest } = require("shared");
        await PullRequest.findOneAndUpdate(
          { repositoryId: connected._id, number: payload.number },
          { repositoryId: connected._id, number: payload.number, status, title: pr.title, branch: pr.head?.ref, baseBranch: pr.base?.ref, author: pr.user?.login, url: pr.html_url },
          { upsert: true }
        );
      }
      if (status === "merged") {
        notify({ type: "pr_merged", title: `PR #${payload.number} merged`, body: payload?.pull_request?.title || "", link: payload?.pull_request?.html_url });
      }
      return res.status(202).json({ ok: true });
    }

    return res.status(202).json({ ok: true, ignored: `event ${event}` });
  } catch (error) {
    console.error("[webhook] failed to route event", error);
    return res.status(500).json({ ok: false, error: "Webhook processing failed" });
  }
}

module.exports = { routeGithubEvent, decideCheckRun };

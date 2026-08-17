const { createFixCodeJob } = require("../services/queueService");
const { createAiLog, upsertPullRequestStatus } = require("../services/dbService");
const { emitEvent } = require("../sockets/socketManager");

async function routeGithubEvent(req, res) {
  const event = req.get("x-github-event");
  const payload = req.body;

  if (event === "check_run" && payload?.check_run?.conclusion === "failure") {
    const prNumber = payload?.check_run?.pull_requests?.[0]?.number;
    await upsertPullRequestStatus(prNumber, "failed");
    await createAiLog({
      action: "Fix workflow started",
      reasoning: `A failed check was received for pull request #${prNumber || "unknown"}.`,
      status: "queued",
    });
    emitEvent("AI_FIX_STARTED", { prNumber });
    await createFixCodeJob({ prNumber, payload });
  }

  if (event === "pull_request") {
    const status = payload?.action || "updated";
    await upsertPullRequestStatus(payload?.number, status);
    await createAiLog({
      action: "Pull request webhook received",
      reasoning: `Pull request #${payload?.number || "unknown"} was ${status}.`,
      status: "recorded",
    });
  }

  return res.status(202).json({ ok: true });
}

module.exports = { routeGithubEvent };

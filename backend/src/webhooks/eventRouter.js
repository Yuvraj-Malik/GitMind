const { createFixCodeJob } = require("../services/queueService");
const { upsertPullRequestStatus } = require("../services/dbService");
const { emitEvent } = require("../sockets/socketManager");

async function routeGithubEvent(req, res) {
  const event = req.get("x-github-event");
  const payload = req.body;

  if (event === "check_run" && payload?.check_run?.conclusion === "failure") {
    const prNumber = payload?.check_run?.pull_requests?.[0]?.number;
    await upsertPullRequestStatus(prNumber, "failed");
    emitEvent("AI_FIX_STARTED", { prNumber });
    await createFixCodeJob({ prNumber, payload });
  }

  if (event === "pull_request") {
    await upsertPullRequestStatus(payload?.number, payload?.action || "updated");
  }

  return res.status(202).json({ ok: true });
}

module.exports = { routeGithubEvent };

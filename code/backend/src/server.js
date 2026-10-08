const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const env = require("./config/env");
const { connectDb } = require("./config/db");
const { initSocket } = require("./sockets/socketManager");
const { startEventsBridge } = require("./sockets/eventsBridge");
const { verifyGithubSignature } = require("./webhooks/githubReceiver");
const { routeGithubEvent } = require("./webhooks/eventRouter");
const { requireAuth, rateLimit } = require("./middleware/auth");
const repos = require("./controllers/repoController");
const { getAiLogs, getActivity } = require("./controllers/workspaceController");
const { getSystemStatus, getOverview, getSandboxFiles, getMe, getNotifications, postNotificationsRead } = require("./controllers/systemController");
const { redirectGithub, handleGithubCallback, handleFirebaseGithubAuth } = require("./controllers/authController");

const app = express();
const allowedOrigins = [env.frontendUrl.replace(/\/$/, ""), "http://localhost:5173"];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "5mb", verify: (req, res, buf) => { req.rawBody = buf; } }));

// ----- Public -----
app.get("/health", (req, res) => {
  const mongoose = require("mongoose");
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  res.json({ status: "ok", database: states[mongoose.connection.readyState] || "unknown", uptime: Math.floor(process.uptime()) });
});
app.get("/auth/github", redirectGithub);
app.get("/auth/github/callback", handleGithubCallback);
app.post("/auth/firebase-github", rateLimit({ name: "login", max: 20 }), handleFirebaseGithubAuth);
app.post("/webhooks/github", verifyGithubSignature, routeGithubEvent);

// ----- Authenticated -----
app.use(requireAuth);
app.get("/auth/me", getMe);
app.get("/overview", getOverview);
app.get("/system/status", getSystemStatus);
app.get("/notifications", getNotifications);
app.post("/notifications/read", postNotificationsRead);
app.get("/ai/logs", getAiLogs);
app.get("/activity", getActivity);
app.get("/sandbox/files", getSandboxFiles);
app.get("/jobs/:jobId", repos.getJob);

app.get("/github/repos", rateLimit({ name: "gh-list", max: 30 }), repos.listGithubRepos);
app.get("/repos", repos.listConnected);
app.post("/repos", rateLimit({ name: "connect", max: 20 }), repos.connect);
app.get("/repos/:id", repos.getRepo);
app.delete("/repos/:id", repos.disconnect);
app.post("/repos/:id/sync", rateLimit({ name: "sync", max: 10 }), repos.sync);
app.post("/repos/:id/webhook", rateLimit({ name: "webhook", max: 10 }), repos.retryWebhook);
app.get("/repos/:id/commits", repos.commits);
app.get("/repos/:id/pull-requests", repos.pullRequests);
app.get("/repos/:id/branches", repos.branches);
app.post("/repos/:id/pull-requests/:number/merge", rateLimit({ name: "merge", max: 10 }), repos.merge);
app.post("/repos/:id/branches/delete", rateLimit({ name: "branch", max: 20 }), repos.removeBranch);
app.post("/repos/:id/trigger-fix", rateLimit({ name: "trigger-fix", max: 3 }), repos.triggerFix);

app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status >= 500) console.error("[backend] request failed", error);
  res.status(status).json({ message: error.message || "Request failed" });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: allowedOrigins } });
initSocket(io);

/** One-time migration: PR numbers used to be globally unique; now unique per repository. */
async function migrateIndexes() {
  const { PullRequest } = require("shared");
  try {
    await PullRequest.collection.dropIndex("number_1");
    console.log("[backend] dropped legacy PullRequest number_1 index");
  } catch (_) { /* not present */ }
  await PullRequest.syncIndexes().catch((e) => console.warn("[backend] index sync:", e.message));
}

connectDb()
  .then(async () => {
    await migrateIndexes();
    startEventsBridge().catch((err) => console.warn("[backend] live updates disabled, Redis unavailable:", err.message));
    server.listen(env.port, "0.0.0.0", () => console.log(`[backend] listening on 0.0.0.0:${env.port}`));
    // Free hosting has room for one process: optionally run the AI worker inside the API server.
    if (process.env.RUN_WORKER_IN_PROCESS === "true") {
      require("path");
      require(require("path").resolve(__dirname, "../../ai-worker/src/queue/worker.js"));
      console.log("[backend] AI worker running in-process (RUN_WORKER_IN_PROCESS=true)");
    }
  })
  .catch((error) => {
    console.error("[backend] startup failed", error);
    process.exit(1);
  });

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => server.close(() => process.exit(0)));
}

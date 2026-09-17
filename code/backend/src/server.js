const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// GitMind Server - Live GitHub Synced
const env = require("./config/env");
const { connectDb } = require("./config/db");
const { initSocket } = require("./sockets/socketManager");
const { verifyGithubSignature } = require("./webhooks/githubReceiver");
const { routeGithubEvent } = require("./webhooks/eventRouter");
const { getRepos, getRepoCommits, triggerFix } = require("./controllers/repoController");
const { postChat } = require("./controllers/chatController");
const { redirectGithub, handleGithubCallback, handleFirebaseGithubAuth } = require("./controllers/authController");
const { getAiLogs, getActivity, getBranches, getPullRequests } = require("./controllers/workspaceController");

const app = express();
app.use(cors());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

const { syncGithubRepo } = require("./services/githubService");

app.get("/health", (req, res) => {
  const mongoose = require("mongoose");
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  res.json({
    status: "ok",
    database: states[mongoose.connection.readyState] || "unknown",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
app.get("/repos", getRepos);
app.get("/repos/:id/commits", getRepoCommits);
app.post("/repos/:id/trigger-fix", triggerFix);
app.get("/pull-requests", getPullRequests);
app.get("/branches", getBranches);
app.get("/activity", getActivity);
app.get("/ai/logs", getAiLogs);
app.post("/chat", postChat);
app.post("/webhooks/github", verifyGithubSignature, routeGithubEvent);

app.post("/sync", async (req, res, next) => {
  try {
    const { owner, repo } = req.body || {};
    const result = await syncGithubRepo(owner, repo);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
app.get("/sync", async (req, res, next) => {
  try {
    const { owner, repo } = req.query || {};
    const result = await syncGithubRepo(owner, repo);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/auth/github", redirectGithub);
app.get("/auth/github/callback", handleGithubCallback);
app.post("/auth/firebase-github", handleFirebaseGithubAuth);

app.use((error, req, res, next) => {
  console.error("[backend] request failed", error);
  res.status(500).json({ message: "Unable to load workspace data." });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

initSocket(io);

connectDb()
  .then(() => {
    server.listen(env.port, "0.0.0.0", () => {
      console.log(`[backend] listening on 0.0.0.0:${env.port}`);
    });
    if (process.env.GITHUB_TOKEN) {
      syncGithubRepo().catch((err) =>
        console.warn("[backend] Initial GitHub sync warning:", err.message)
      );
    }
  })
  .catch((error) => {
    console.error("[backend] startup failed", error);
    process.exit(1);
  });

process.on("SIGTERM", () => {
  console.log("[backend] SIGTERM received, closing server");
  server.close(() => {
    console.log("[backend] HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("[backend] SIGINT received, closing server");
  server.close(() => {
    console.log("[backend] HTTP server closed");
    process.exit(0);
  });
});

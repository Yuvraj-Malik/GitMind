const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const env = require("./config/env");
const { connectDb } = require("./config/db");
const { initSocket } = require("./sockets/socketManager");
const { verifyGithubSignature } = require("./webhooks/githubReceiver");
const { routeGithubEvent } = require("./webhooks/eventRouter");
const { getRepos, getRepoCommits } = require("./controllers/repoController");
const { postChat } = require("./controllers/chatController");
const { redirectGithub, handleGithubCallback } = require("./controllers/authController");
const { getAiLogs, getActivity, getBranches, getPullRequests } = require("./controllers/workspaceController");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/repos", getRepos);
app.get("/repos/:id/commits", getRepoCommits);
app.get("/pull-requests", getPullRequests);
app.get("/branches", getBranches);
app.get("/activity", getActivity);
app.get("/ai/logs", getAiLogs);
app.post("/chat", postChat);
app.post("/webhooks/github", verifyGithubSignature, routeGithubEvent);

app.get("/auth/github", redirectGithub);
app.get("/auth/github/callback", handleGithubCallback);

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
    server.listen(env.port, () => {
      console.log(`[backend] listening on ${env.port}`);
    });
  })
  .catch((error) => {
    console.error("[backend] startup failed", error);
    process.exit(1);
  });

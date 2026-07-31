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

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/repos", getRepos);
app.get("/repos/:id/commits", getRepoCommits);
app.post("/chat", postChat);
app.post("/webhooks/github", verifyGithubSignature, routeGithubEvent);

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

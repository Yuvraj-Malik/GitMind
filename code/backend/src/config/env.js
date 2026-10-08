const path = require("path");
const dotenv = require("dotenv");

// Load from project root .env first, fallback to code/.env or process.cwd()
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const isTest = process.env.NODE_ENV === "test";

// No insecure fallbacks: the server refuses to start without a real JWT secret.
const jwtSecret = process.env.JWT_SECRET || (isTest ? "test-only-secret" : "");
if (!jwtSecret || jwtSecret === "default_super_secret_key" || jwtSecret.length < 16) {
  throw new Error(
    "[env] JWT_SECRET is missing or too weak (min 16 chars). Set it in .env, e.g. `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"`"
  );
}

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri:
    process.env.MONGO_URI ||
    "mongodb://admin:admin123@localhost:27017/gitmind?authSource=admin",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`,
  jwtSecret,
  githubClientId: process.env.GITHUB_CLIENT_ID || "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  // Comma-separated GitHub usernames allowed to log in. Empty = anyone with a GitHub account.
  allowedGithubUsers: (process.env.ALLOWED_GITHUB_USERS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  // Repos (owner/name) the webhook may act on. Empty = only GITHUB_REPO_OWNER/GITHUB_REPO_NAME.
  allowedRepos: (process.env.ALLOWED_REPOS ||
    (process.env.GITHUB_REPO_OWNER && process.env.GITHUB_REPO_NAME
      ? `${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}`
      : ""))
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};

const path = require("path");
const dotenv = require("dotenv");

// Load from project root .env first, fallback to code/.env or process.cwd()
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri:
    process.env.MONGO_URI ||
    "mongodb://admin:admin123@localhost:27017/gitmind?authSource=admin",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`,
  jwtSecret: process.env.JWT_SECRET || "default_super_secret_key",
  githubClientId: process.env.GITHUB_CLIENT_ID || "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || "",
};

const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri:
    process.env.MONGO_URI ||
    "mongodb://admin:admin123@localhost:27017/gitmind?authSource=admin",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
};

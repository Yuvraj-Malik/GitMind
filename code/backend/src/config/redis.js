const IORedis = require("ioredis");
const env = require("./env");

const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisConnection.on("error", (err) => {
  console.warn("[redis] connection warning:", err.message);
});

redisConnection.on("connect", () => {
  console.log("[redis] connected successfully");
});

module.exports = { redisConnection };

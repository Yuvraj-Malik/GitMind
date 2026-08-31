const IORedis = require("ioredis");
const env = require("./env");

const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

module.exports = { redisConnection };

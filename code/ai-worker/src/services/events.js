const IORedis = require("ioredis");
const { EVENTS_CHANNEL } = require("shared");

let pub = null;
function getPublisher() {
  if (!pub) {
    pub = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: 1 });
    pub.on("error", (err) => console.warn("[ai-worker] event publisher warning:", err.message));
  }
  return pub;
}

/** Publish a progress event; the backend relays it to the dashboard over Socket.io. Never throws. */
async function publishEvent(event, payload) {
  try {
    await getPublisher().publish(EVENTS_CHANNEL, JSON.stringify({ event, payload }));
  } catch (err) {
    console.warn(`[ai-worker] could not publish ${event}:`, err.message);
  }
}

async function closePublisher() {
  if (pub) await pub.quit().catch(() => {});
  pub = null;
}

module.exports = { publishEvent, closePublisher };

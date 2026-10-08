const { EVENTS_CHANNEL } = require("shared");
const { redisConnection } = require("../config/redis");
const { emitToUser } = require("./socketManager");

/** Relays worker progress (Redis pub/sub) to the owning user's dashboards and records notifications. */
async function startEventsBridge() {
  const { notificationFromEvent, ownerOf } = require("../services/notificationService");
  const sub = redisConnection.duplicate();
  sub.on("error", (err) => console.warn("[events] redis subscriber warning:", err.message));
  await sub.subscribe(EVENTS_CHANNEL);
  sub.on("message", async (_channel, message) => {
    try {
      const { event, payload } = JSON.parse(message);
      if (!event) return;
      const userId = await ownerOf(payload);
      if (!userId) return;
      emitToUser(userId, event, payload);
      await notificationFromEvent(event, payload, userId);
    } catch (err) {
      console.warn("[events] bad message on channel:", err.message);
    }
  });
  console.log(`[events] relaying ${EVENTS_CHANNEL} -> socket.io (per user)`);
  return sub;
}

module.exports = { startEventsBridge };

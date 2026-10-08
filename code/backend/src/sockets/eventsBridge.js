const { EVENTS_CHANNEL } = require("shared");
const { redisConnection } = require("../config/redis");
const { emitEvent } = require("./socketManager");

/** Relays worker progress (Redis pub/sub) to dashboards over Socket.io and records notifications. */
async function startEventsBridge() {
  const { notificationFromEvent } = require("../services/notificationService");
  const sub = redisConnection.duplicate();
  sub.on("error", (err) => console.warn("[events] redis subscriber warning:", err.message));
  await sub.subscribe(EVENTS_CHANNEL);
  sub.on("message", (_channel, message) => {
    try {
      const { event, payload } = JSON.parse(message);
      if (!event) return;
      emitEvent(event, payload);
      notificationFromEvent(event, payload).catch(() => {});
    } catch (err) {
      console.warn("[events] bad message on channel:", err.message);
    }
  });
  console.log(`[events] relaying ${EVENTS_CHANNEL} -> socket.io`);
  return sub;
}

module.exports = { startEventsBridge };

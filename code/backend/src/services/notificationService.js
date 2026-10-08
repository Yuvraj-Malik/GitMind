const { Notification, SOCKET_EVENTS } = require("shared");
const { emitEvent } = require("../sockets/socketManager");

async function notify({ type, title, body, link, jobId }) {
  try {
    const doc = await Notification.create({ type, title, body, link, jobId });
    emitEvent(SOCKET_EVENTS.NOTIFICATION, doc.toObject());
    return doc;
  } catch (err) {
    console.warn("[notify] failed:", err.message);
    return null;
  }
}

async function listNotifications(limit = 30) {
  const [items, unread] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ read: false }),
  ]);
  return { items, unread };
}

async function markRead(ids) {
  const filter = Array.isArray(ids) && ids.length ? { _id: { $in: ids } } : {};
  await Notification.updateMany(filter, { $set: { read: true } });
  return listNotifications();
}

/** Turns worker progress events into persisted notifications. */
async function notificationFromEvent(event, p = {}) {
  const where = p.filePath || (p.prNumber ? `PR #${p.prNumber}` : p.repoName || "repository");
  if (event === SOCKET_EVENTS.AI_FIX_COMPLETED) {
    return notify({ type: "ai_fix_success", title: "AI fix ready for review", body: p.summary || `Verified fix opened for ${where}.`, link: p.prUrl, jobId: p.jobId });
  }
  if (event === SOCKET_EVENTS.AI_FIX_FAILED) {
    if (p.skipped) {
      return notify({ type: "ai_fix_skipped", title: "AI fix skipped", body: p.error, link: "/ai", jobId: p.jobId });
    }
    return notify({ type: "ai_fix_failed", title: `AI fix failed (${String(p.failed_at || "unknown").replace(/_/g, " ")})`, body: String(p.error || "").slice(0, 300), link: "/ai", jobId: p.jobId });
  }
  return null;
}

module.exports = { notify, listNotifications, markRead, notificationFromEvent };

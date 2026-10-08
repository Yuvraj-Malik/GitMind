const { Notification, Repository, SOCKET_EVENTS } = require("shared");
const { emitToUser } = require("../sockets/socketManager");

async function notify({ userId, type, title, body, link, jobId }) {
  if (!userId) return null;
  try {
    const doc = await Notification.create({ userId, type, title, body, link, jobId });
    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION, doc.toObject());
    return doc;
  } catch (err) {
    console.warn("[notify] failed:", err.message);
    return null;
  }
}

async function listNotifications(userId, limit = 30) {
  const [items, unread] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ userId, read: false }),
  ]);
  return { items, unread };
}

async function markRead(userId, ids) {
  const filter = { userId };
  if (Array.isArray(ids) && ids.length) filter._id = { $in: ids };
  await Notification.updateMany(filter, { $set: { read: true } });
  return listNotifications(userId);
}

/** Who owns an event: the user who connected the repo, else the user who started the job. */
async function ownerOf(p = {}) {
  if (p.repositoryId) {
    const repo = await Repository.findById(p.repositoryId).select("connectedBy").lean().catch(() => null);
    if (repo?.connectedBy) return String(repo.connectedBy);
  }
  return p.userId ? String(p.userId) : null;
}

/** Turns worker progress events into persisted, per-user notifications. */
async function notificationFromEvent(event, p = {}, userId) {
  const where = p.filePath || (p.prNumber ? `PR #${p.prNumber}` : p.repoName || "repository");
  if (event === SOCKET_EVENTS.AI_FIX_COMPLETED) {
    return notify({ userId, type: "ai_fix_success", title: "AI fix ready for review", body: p.summary || `Verified fix opened for ${where}.`, link: p.prUrl, jobId: p.jobId });
  }
  if (event === SOCKET_EVENTS.AI_FIX_FAILED) {
    if (p.skipped) return notify({ userId, type: "ai_fix_skipped", title: "AI fix skipped", body: p.error, link: "/ai", jobId: p.jobId });
    return notify({ userId, type: "ai_fix_failed", title: `AI fix failed (${String(p.failed_at || "unknown").replace(/_/g, " ")})`, body: String(p.error || "").slice(0, 300), link: "/ai", jobId: p.jobId });
  }
  return null;
}

module.exports = { notify, listNotifications, markRead, notificationFromEvent, ownerOf };

const SOCKET_EVENTS = {
  AI_FIX_STARTED: "AI_FIX_STARTED",
  AI_FIX_COMPLETED: "AI_FIX_COMPLETED",
  AI_FIX_FAILED: "AI_FIX_FAILED",
  NEW_NODE_ADDED: "NEW_NODE_ADDED",
  NEW_PR_CREATED: "NEW_PR_CREATED",
  NOTIFICATION: "NOTIFICATION",
};

// BullMQ queue shared by backend (producer) and ai-worker (consumer).
const QUEUE_NAME = "git-mind-jobs";

// Redis pub/sub channel the worker publishes progress on; backend relays to Socket.io.
const EVENTS_CHANNEL = "gitmind:events";

// Branch prefix used for every AI-generated fix branch.
const AI_FIX_BRANCH_PREFIX = "ai/fix-";

module.exports = { SOCKET_EVENTS, QUEUE_NAME, EVENTS_CHANNEL, AI_FIX_BRANCH_PREFIX };

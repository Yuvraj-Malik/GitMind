const failureStates = new Set(["failed", "failure", "error", "cancelled", "canceled"]);
const progressStates = new Set(["queued", "pending", "open", "in_progress", "started"]);
const successStates = new Set(["success", "passed", "completed", "merged", "recorded", "ready"]);

export function getStatusTone(value) {
  const status = String(value || "unknown").toLowerCase().replace(/\s+/g, "_");
  if (failureStates.has(status)) return "danger";
  if (progressStates.has(status)) return "warning";
  if (successStates.has(status)) return "success";
  return "neutral";
}

export function formatStatus(value) {
  return String(value || "unknown").replace(/_/g, " ");
}

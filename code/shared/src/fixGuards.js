const { AI_FIX_BRANCH_PREFIX } = require("./constants");

/** True for branches created by Git-Mind itself; these must never re-trigger the fixer. */
function isAiFixBranch(branch) {
  if (!branch || typeof branch !== "string") return false;
  return branch.replace(/^refs\/heads\//, "").startsWith(AI_FIX_BRANCH_PREFIX);
}

/** Deterministic BullMQ job id: one fix job per repo + commit. BullMQ ids may not contain ':'. */
function fixJobId(repoFullName, headSha) {
  const safe = (s) => String(s || "unknown").replace(/[^A-Za-z0-9._-]/g, "_");
  return `fix-${safe(repoFullName)}-${safe(headSha)}`;
}

/** True when a file path looks like a test file (used to block "gamed" patches that edit tests). */
function isTestFile(filePath) {
  if (!filePath) return false;
  const p = String(filePath).replace(/\\/g, "/");
  return /(^|\/)(__tests__|tests?)\//.test(p) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(p);
}

module.exports = { isAiFixBranch, fixJobId, isTestFile };

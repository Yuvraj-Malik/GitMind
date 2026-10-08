const mongoose = require("mongoose");

const AILogSchema = new mongoose.Schema(
  {
    jobId: String,
    trigger: String, // "manual" | "webhook"
    action: String,
    reasoning: String, // model's summary of the fix, or failure reason
    status: String, // queued | running | success | failed | skipped
    repoName: String,
    repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", index: true },
    headSha: String,
    baseBranch: String,
    prNumber: Number,
    branch: String,
    prUrl: String,
    filePath: String,
    failedAt: String,
    attempt: Number,
    errorLog: String, // raw failing test output (truncated)
    durationMs: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.models.AILog || mongoose.model("AILog", AILogSchema);

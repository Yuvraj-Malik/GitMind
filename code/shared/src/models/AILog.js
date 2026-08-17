const mongoose = require("mongoose");

const AILogSchema = new mongoose.Schema(
  {
    jobId: String,
    action: String,
    reasoning: String,
    status: String,
    repoName: String,
    branch: String,
    prUrl: String,
    filePath: String,
    failedAt: String,
    attempt: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("AILog", AILogSchema);

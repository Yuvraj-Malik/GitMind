const mongoose = require("mongoose");

const PullRequestSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    title: String,
    status: String,
    branch: String,
    baseBranch: String,
    author: String,
    url: String,
    repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", index: true },
  },
  { timestamps: true }
);
// PR numbers are only unique within a repository.
PullRequestSchema.index({ repositoryId: 1, number: 1 }, { unique: true });

module.exports = mongoose.models.PullRequest || mongoose.model("PullRequest", PullRequestSchema);

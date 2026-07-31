const mongoose = require("mongoose");

const PullRequestSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    title: String,
    status: String,
    repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Repository" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PullRequest", PullRequestSchema);

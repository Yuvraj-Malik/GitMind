const mongoose = require("mongoose");

/** One CI check run (e.g. a GitHub Actions job) reported by GitHub for a connected repository. */
const CheckRunSchema = new mongoose.Schema(
  {
    repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", index: true },
    githubId: { type: Number, required: true, unique: true },
    name: String,
    status: String, // queued | in_progress | completed
    conclusion: String, // success | failure | cancelled | skipped | timed_out | neutral | action_required | null
    headSha: { type: String, index: true },
    headBranch: String,
    prNumbers: [Number],
    startedAt: Date,
    completedAt: Date,
    durationMs: Number,
    url: String,
  },
  { timestamps: true }
);
CheckRunSchema.index({ repositoryId: 1, completedAt: -1 });

/** Normalise a GitHub check_run object into our document shape. */
CheckRunSchema.statics.fromGithub = function fromGithub(run, repositoryId) {
  const startedAt = run.started_at ? new Date(run.started_at) : null;
  const completedAt = run.completed_at ? new Date(run.completed_at) : null;
  return {
    repositoryId,
    githubId: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion || null,
    headSha: run.head_sha,
    headBranch: run.check_suite?.head_branch || run.pull_requests?.[0]?.head?.ref || null,
    prNumbers: (run.pull_requests || []).map((p) => p.number),
    startedAt,
    completedAt,
    durationMs: startedAt && completedAt ? completedAt - startedAt : null,
    url: run.html_url || run.details_url || null,
  };
};

CheckRunSchema.statics.upsertFromGithub = function upsertFromGithub(run, repositoryId) {
  const doc = this.fromGithub(run, repositoryId);
  return this.findOneAndUpdate({ githubId: doc.githubId }, { $set: doc }, { upsert: true, returnDocument: "after" });
};

module.exports = mongoose.models.CheckRun || mongoose.model("CheckRun", CheckRunSchema);

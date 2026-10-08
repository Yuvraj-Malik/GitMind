const mongoose = require("mongoose");

const RepositorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner: { type: String, required: true },
    fullName: { type: String, index: true }, // owner/name, lowercase-insensitive lookups use fullNameLower
    fullNameLower: { type: String, index: true },
    githubId: Number,
    private: Boolean,
    url: { type: String, required: true },
    defaultBranch: String,
    connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    webhookId: Number,
    webhookStatus: String, // active | not_configured | error
    webhookError: String,
    lastSyncedAt: Date,
    syncError: String,
    commits: { type: Array, default: [] },
    branches: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Repository || mongoose.model("Repository", RepositorySchema);

const mongoose = require("mongoose");

const RepositorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner: { type: String, required: true },
    url: { type: String, required: true },
    commits: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Repository", RepositorySchema);

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  githubId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  avatarUrl: { type: String },
  accessToken: { type: String }, // Optional: if we need to call GitHub API on their behalf later
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);

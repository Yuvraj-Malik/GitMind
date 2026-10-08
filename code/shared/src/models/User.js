const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firebaseUid: { type: String },
  githubId: { type: String, unique: true, sparse: true },
  username: { type: String, required: true },
  avatarUrl: { type: String },
  accessToken: { type: String }, // GitHub OAuth token, AES-GCM encrypted (see shared/src/secrets.js)
  tokenScopes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);

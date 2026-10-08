const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    type: String, // ai_fix_success | ai_fix_failed | ai_fix_skipped | check_failed | pr_merged
    title: String,
    body: String,
    link: String,
    jobId: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
NotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

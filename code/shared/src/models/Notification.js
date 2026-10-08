const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    type: String, // ai_fix_success | ai_fix_failed | ai_fix_skipped | check_failed | pr_merged
    title: String,
    body: String,
    link: String, // external URL (e.g. PR) or app route
    jobId: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

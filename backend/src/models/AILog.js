const mongoose = require("mongoose");

const AILogSchema = new mongoose.Schema(
  {
    jobId: String,
    action: String,
    reasoning: String,
    status: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("AILog", AILogSchema);

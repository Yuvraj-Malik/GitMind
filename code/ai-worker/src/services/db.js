const mongoose = require("mongoose");
const { AILog } = require("shared");

let connecting = null;

async function ensureDb() {
  if (mongoose.connection.readyState === 1) return true;
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("[ai-worker] MONGO_URI is missing; AI logs will not be persisted");
    return false;
  }
  try {
    connecting = connecting || mongoose.connect(mongoUri);
    await connecting;
    console.log("[ai-worker] MongoDB connected");
    return true;
  } catch (err) {
    connecting = null;
    console.error("[ai-worker] MongoDB connection error:", err.message);
    return false;
  }
}

/** One record per run: updates the "queued" record the backend created for this job, or inserts. */
async function writeAILog(logData) {
  if (!(await ensureDb())) return null;
  try {
    if (logData.jobId) {
      return await AILog.findOneAndUpdate(
        { jobId: logData.jobId },
        { $set: logData },
        { upsert: true, returnDocument: "after" }
      );
    }
    return await AILog.create(logData);
  } catch (err) {
    console.error("[ai-worker] Failed to write AILog:", err.message);
    return null;
  }
}

module.exports = { writeAILog, ensureDb };

const mongoose = require("mongoose");
const { AILog } = require("shared");

let isConnected = false;

async function ensureDb() {
  if (isConnected) return;
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI is missing in environment");
    
    await mongoose.connect(mongoUri);
    isConnected = true;
    console.log("[ai-worker] MongoDB connected");
  } catch (err) {
    console.error("[ai-worker] MongoDB connection error:", err);
  }
}

async function writeAILog(logData) {
  await ensureDb();
  try {
    return await AILog.create(logData);
  } catch (err) {
    console.error("[ai-worker] Failed to write AILog:", err);
  }
}

module.exports = { writeAILog };

const mongoose = require("mongoose");
const env = require("./env");

async function connectDb() {
  mongoose.connection.on("connected", () => {
    console.log("[backend] MongoDB connected successfully");
  });
  mongoose.connection.on("error", (err) => {
    console.error("[backend] MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[backend] MongoDB disconnected");
  });

  await mongoose.connect(env.mongoUri);
}

module.exports = { connectDb };

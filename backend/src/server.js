const mongoose = require("mongoose");
require("dotenv").config();
const express = require("express");

const app = express();

app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.send("Git-Mind Backend is Running");
});

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((error) => {
        console.log("MongoDB connection error:", error);
    });

// Start server
const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Git-Mind backend running on port ${PORT}`);
});
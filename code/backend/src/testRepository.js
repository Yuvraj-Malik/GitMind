require("dotenv").config();

const mongoose = require("mongoose");
const Repository = require("./models/Repository");

async function testRepository() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");

        // Create a test repository
        const repository = await Repository.create({
            name: "Git-Mind",
            owner: "seerat-gh",
            githubUrl: "https://github.com/seerat-gh/Git-Mind"
        });

        console.log("Repository saved successfully!");
        console.log(repository);

        // Close the database connection
        await mongoose.disconnect();
        console.log("MongoDB connection closed");
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testRepository();
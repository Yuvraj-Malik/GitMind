const mongoose = require("mongoose");

const pullRequestSchema = new mongoose.Schema({
    repository: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Repository"
    },
    prNumber: {
        type: Number,
        required: true
    },
    title: {
        type: String
    },
    status: {
        type: String,
        default: "open"
    },
    branch: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("PullRequest", pullRequestSchema);
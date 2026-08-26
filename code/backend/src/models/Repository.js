const mongoose = require("mongoose");

const repositorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    owner: {
        type: String,
        required: true
    },

    githubUrl: {
        type: String
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Repository", repositorySchema);
const Repository = require("../models/Repository");
const PullRequest = require("../models/PullRequest");

async function listRepositories() {
  return Repository.find().lean();
}

async function listRepoCommits(repositoryId) {
  const repo = await Repository.findById(repositoryId).lean();
  return repo?.commits || [];
}

async function upsertPullRequestStatus(number, status) {
  if (!number) return null;
  return PullRequest.findOneAndUpdate(
    { number },
    { number, status, updatedAt: new Date() },
    { upsert: true, new: true }
  );
}

module.exports = {
  listRepositories,
  listRepoCommits,
  upsertPullRequestStatus,
};

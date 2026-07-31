const { listRepositories, listRepoCommits } = require("../services/dbService");

async function getRepos(req, res) {
  const repos = await listRepositories();
  res.json(repos);
}

async function getRepoCommits(req, res) {
  const commits = await listRepoCommits(req.params.id);
  res.json(commits);
}

module.exports = { getRepos, getRepoCommits };

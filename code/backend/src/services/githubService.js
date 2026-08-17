const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function getPullRequest(owner, repo, pull_number) {
  const response = await octokit.pulls.get({ owner, repo, pull_number });
  return response.data;
}

module.exports = { getPullRequest };

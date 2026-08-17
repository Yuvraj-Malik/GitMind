const { Octokit } = require("@octokit/rest");
require('dotenv').config({ path: '.env' });

async function test() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  try {
    const { data } = await octokit.rest.users.getAuthenticated();
    console.log("Authenticated as:", data.login);
    
    // Check repo access
    const repo = await octokit.rest.repos.get({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME
    });
    console.log("Repo found:", repo.data.full_name);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();

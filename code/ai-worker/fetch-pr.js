const { Octokit } = require("@octokit/rest");
require('dotenv').config({ path: '../.env' });

async function checkPR() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  try {
    const pr = await octokit.rest.pulls.get({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      pull_number: 9,
      mediaType: {
        format: "diff"
      }
    });

    const prData = await octokit.rest.pulls.get({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      pull_number: 9
    });

    console.log("=== PR INFO ===");
    console.log("Title:", prData.data.title);
    console.log("Body:", prData.data.body);
    console.log("Base Branch:", prData.data.base.ref);
    console.log("Head Branch:", prData.data.head.ref);
    console.log("URL:", prData.data.html_url);
    console.log("=== PR DIFF ===");
    console.log(pr.data);
  } catch(e) {
    console.error(e.message);
  }
}

checkPR();

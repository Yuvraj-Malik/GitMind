require('dotenv').config({ path: '../.env' });
const { Octokit } = require('@octokit/rest');

async function cleanup() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;

  try {
    const prs = await octokit.rest.pulls.list({ owner, repo, state: 'open' });
    for (const pr of prs.data) {
      if (pr.head.ref.startsWith('ai/fix-pr-')) {
        console.log(`Closing PR #${pr.number}`);
        await octokit.rest.pulls.update({
          owner, repo, pull_number: pr.number, state: 'closed'
        });
        console.log(`Deleting branch ${pr.head.ref}`);
        try {
          await octokit.rest.git.deleteRef({
            owner, repo, ref: `heads/${pr.head.ref}`
          });
        } catch(e) { console.error('Failed to delete branch', e.message); }
      }
    }
  } catch(e) { console.error(e); }
}
cleanup();

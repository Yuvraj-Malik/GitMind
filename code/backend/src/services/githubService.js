const { Octokit } = require("@octokit/rest");
const { Repository, PullRequest } = require("shared");

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function getPullRequest(owner, repo, pull_number) {
  const response = await octokit.pulls.get({ owner, repo, pull_number });
  return response.data;
}

async function syncGithubRepo(
  owner = process.env.GITHUB_REPO_OWNER || "Yuvraj-Malik",
  repo = process.env.GITHUB_REPO_NAME || "git-mind-test"
) {
  if (!process.env.GITHUB_TOKEN) {
    console.warn("[githubService] GITHUB_TOKEN not set, skipping GitHub sync.");
    return { success: false, reason: "GITHUB_TOKEN missing" };
  }

  try {
    console.log(`[githubService] Starting GitHub sync for ${owner}/${repo}...`);
    
    // 1. Fetch Repository details
    const repoRes = await octokit.rest.repos.get({ owner, repo });
    const repoInfo = repoRes.data;

    // 2. Fetch all Branches
    const branchesRes = await octokit.rest.repos.listBranches({ owner, repo, per_page: 100 });
    const branches = branchesRes.data.map((b) => ({
      name: b.name,
      commitSha: b.commit?.sha,
      commitCount: b.name === "main" ? 12 : 1,
      updatedAt: new Date().toISOString(),
    }));

    // 3. Fetch Commits
    const commitsRes = await octokit.rest.repos.listCommits({ owner, repo, per_page: 100 });
    const commits = commitsRes.data.map((c) => ({
      id: c.sha.slice(0, 7),
      sha: c.sha.slice(0, 7),
      fullSha: c.sha,
      title: c.commit.message?.split("\n")[0] || "Commit",
      message: c.commit.message,
      author: c.commit.author?.name || c.author?.login || "Yuvraj-Malik",
      branch: "main",
      createdAt: c.commit.author?.date ? new Date(c.commit.author.date) : new Date(),
      updatedAt: c.commit.author?.date ? new Date(c.commit.author.date) : new Date(),
    }));

    // Update branch commit count for main branch
    const mainBranch = branches.find((b) => b.name === "main");
    if (mainBranch) {
      mainBranch.commitCount = commits.length;
    }

    // 4. Upsert Repository in MongoDB
    const repoDoc = await Repository.findOneAndUpdate(
      { name: repo, owner },
      {
        name: repo,
        owner,
        url: repoInfo.html_url || `https://github.com/${owner}/${repo}`,
        branches,
        commits,
      },
      { upsert: true, new: true }
    );

    // 5. Fetch Pull Requests (open, closed, merged)
    const prsRes = await octokit.rest.pulls.list({ owner, repo, state: "all", per_page: 100 });
    for (const pr of prsRes.data) {
      const status = pr.state === "closed" ? (pr.merged_at ? "merged" : "closed") : "open";
      await PullRequest.findOneAndUpdate(
        { number: pr.number },
        {
          number: pr.number,
          title: pr.title || `Fix applied in attempt 1`,
          status,
          branch: pr.head?.ref || "main",
          author: pr.user?.login || "Yuvraj-Malik",
          url: pr.html_url,
          repositoryId: repoDoc._id,
          updatedAt: pr.updated_at ? new Date(pr.updated_at) : new Date(),
          createdAt: pr.created_at ? new Date(pr.created_at) : new Date(),
        },
        { upsert: true, new: true }
      );
    }

    console.log(
      `[githubService] Successfully synced ${owner}/${repo}: ${branches.length} branches, ${commits.length} commits, ${prsRes.data.length} PRs.`
    );

    return {
      success: true,
      repository: repoDoc.name,
      repositoryId: repoDoc._id,
      branchesCount: branches.length,
      commitsCount: commits.length,
      prsCount: prsRes.data.length,
    };
  } catch (error) {
    console.error(`[githubService] GitHub sync failed:`, error.message);
    throw error;
  }
}

module.exports = { getPullRequest, syncGithubRepo };


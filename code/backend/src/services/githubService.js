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

    // 2. Fetch all Branches with their actual commit dates
    const branchesRes = await octokit.rest.repos.listBranches({ owner, repo, per_page: 100 });
    const branches = await Promise.all(
      branchesRes.data.map(async (b) => {
        let commitDate = null;
        try {
          if (b.commit?.sha) {
            const commitRes = await octokit.rest.repos.getCommit({
              owner,
              repo,
              ref: b.commit.sha,
            });
            commitDate =
              commitRes.data.commit.committer?.date ||
              commitRes.data.commit.author?.date;
          }
        } catch (e) {
          console.warn(`[githubService] Failed to fetch commit for branch ${b.name}:`, e.message);
        }

        return {
          name: b.name,
          commitSha: b.commit?.sha,
          commitCount: b.name === "main" ? 12 : 1,
          updatedAt: commitDate || new Date().toISOString(),
        };
      })
    );

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

async function mergePullRequest(
  owner = process.env.GITHUB_REPO_OWNER || "Yuvraj-Malik",
  repo = process.env.GITHUB_REPO_NAME || "git-mind-test",
  pull_number,
  commit_title
) {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN not configured");
  }

  const prNum = parseInt(pull_number, 10);
  if (isNaN(prNum)) {
    throw new Error("Invalid pull request number");
  }

  console.log(`[githubService] Merging PR #${prNum} in ${owner}/${repo}...`);
  const mergeRes = await octokit.rest.pulls.merge({
    owner,
    repo,
    pull_number: prNum,
    commit_title: commit_title || `Merge pull request #${prNum} via GitMind`,
    merge_method: "merge",
  });

  // Update in MongoDB
  await PullRequest.findOneAndUpdate(
    { number: prNum },
    { status: "merged", updatedAt: new Date() }
  );

  // Trigger background re-sync
  syncGithubRepo(owner, repo).catch((e) =>
    console.warn("[githubService] Post-merge sync warning:", e.message)
  );

  return {
    success: true,
    merged: mergeRes.data.merged,
    message: mergeRes.data.message,
    sha: mergeRes.data.sha,
  };
}

async function deleteBranch(
  owner = process.env.GITHUB_REPO_OWNER || "Yuvraj-Malik",
  repo = process.env.GITHUB_REPO_NAME || "git-mind-test",
  branchName
) {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN not configured");
  }

  const cleanBranch = (branchName || "").trim().replace(/^refs\/heads\//, "");
  if (!cleanBranch) {
    throw new Error("Branch name required");
  }

  // Safety protection for primary branches
  if (["main", "master", "develop", "production"].includes(cleanBranch.toLowerCase())) {
    throw new Error(`Cannot delete protected branch: ${cleanBranch}`);
  }

  console.log(`[githubService] Deleting branch '${cleanBranch}' in ${owner}/${repo}...`);
  await octokit.rest.git.deleteRef({
    owner,
    repo,
    ref: `heads/${cleanBranch}`,
  });

  // Remove from MongoDB Repository.branches
  await Repository.updateMany(
    { owner, name: repo },
    { $pull: { branches: { name: cleanBranch } } }
  );

  return {
    success: true,
    branch: cleanBranch,
    message: `Branch '${cleanBranch}' deleted successfully.`,
  };
}

module.exports = { getPullRequest, syncGithubRepo, mergePullRequest, deleteBranch };



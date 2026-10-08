const { Octokit } = require("@octokit/rest");
const { Repository, PullRequest, User, decryptSecret } = require("shared");
const env = require("../config/env");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Octokit authenticated as the signed-in user (their OAuth token, decrypted). */
async function userOctokit(userId) {
  const user = await User.findById(userId).lean();
  const token = decryptSecret(user?.accessToken);
  if (!token) throw new HttpError(401, "Your GitHub session is missing or expired. Please sign in with GitHub again.");
  return new Octokit({ auth: token });
}

/** Octokit for a connected repo: the token of the user who connected it. */
async function repoOctokit(repoDoc) {
  return userOctokit(repoDoc.connectedBy);
}

function ghError(err, what) {
  if (err instanceof HttpError) return err;
  const status = err.status === 401 ? 401 : err.status === 404 ? 404 : err.status === 403 ? 403 : 502;
  const msg = err.response?.data?.message || err.message;
  const hint = status === 401 ? " (sign in with GitHub again)" : status === 403 && /scope|permission|Resource not accessible/i.test(msg) ? " (missing GitHub permission: sign out and sign in again to grant it)" : "";
  return new HttpError(status, `${what}: ${msg}${hint}`);
}

/** All repos the user can see on GitHub (owner, collaborator, org member), newest activity first. */
async function listUserGithubRepos(userId) {
  const octokit = await userOctokit(userId);
  try {
    const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      per_page: 100,
      sort: "pushed",
      affiliation: "owner,collaborator,organization_member",
    });
    return repos.map((r) => ({
      githubId: r.id,
      fullName: r.full_name,
      name: r.name,
      owner: r.owner.login,
      private: r.private,
      description: r.description,
      language: r.language,
      defaultBranch: r.default_branch,
      pushedAt: r.pushed_at,
      url: r.html_url,
      canAdmin: Boolean(r.permissions?.admin),
      canPush: Boolean(r.permissions?.push),
      archived: r.archived,
    }));
  } catch (err) {
    throw ghError(err, "Could not list your GitHub repositories");
  }
}

function webhookUrl() {
  const base = (process.env.PUBLIC_WEBHOOK_URL || "").replace(/\/$/, "");
  if (!/^https:\/\//.test(base)) return null;
  return base.endsWith("/webhooks/github") ? base : `${base}/webhooks/github`;
}

/** Install (or reuse) the Git-Mind webhook on the repo. Never throws; records status on the doc. */
async function ensureWebhook(repoDoc, octokit) {
  const url = webhookUrl();
  if (!url || !env.githubWebhookSecret) {
    repoDoc.webhookStatus = "not_configured";
    repoDoc.webhookError = !url
      ? "Set PUBLIC_WEBHOOK_URL (an https URL such as your ngrok address) to enable automatic fixes on CI failure."
      : "Set GITHUB_WEBHOOK_SECRET to enable automatic fixes.";
    return repoDoc;
  }
  try {
    const { data: hooks } = await octokit.rest.repos.listWebhooks({ owner: repoDoc.owner, repo: repoDoc.name });
    let hook = hooks.find((h) => h.config?.url === url);
    const config = { url, content_type: "json", secret: env.githubWebhookSecret, insecure_ssl: "0" };
    if (hook) {
      await octokit.rest.repos.updateWebhook({ owner: repoDoc.owner, repo: repoDoc.name, hook_id: hook.id, config, events: ["check_run", "pull_request"], active: true });
    } else {
      ({ data: hook } = await octokit.rest.repos.createWebhook({ owner: repoDoc.owner, repo: repoDoc.name, config, events: ["check_run", "pull_request"], active: true }));
    }
    repoDoc.webhookId = hook.id;
    repoDoc.webhookStatus = "active";
    repoDoc.webhookError = null;
  } catch (err) {
    repoDoc.webhookStatus = "error";
    repoDoc.webhookError = ghError(err, "Webhook setup failed").message;
  }
  return repoDoc;
}

async function removeWebhook(repoDoc) {
  if (!repoDoc.webhookId) return;
  try {
    const octokit = await repoOctokit(repoDoc);
    await octokit.rest.repos.deleteWebhook({ owner: repoDoc.owner, repo: repoDoc.name, hook_id: repoDoc.webhookId });
  } catch (err) {
    console.warn(`[github] could not remove webhook from ${repoDoc.fullName}:`, err.message);
  }
}

/** Connect a GitHub repo to Git-Mind for this user, install the webhook, run a first sync. */
async function connectRepository(userId, fullName) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(fullName || "")) throw new HttpError(400, "fullName must look like owner/repo");
  const octokit = await userOctokit(userId);
  const [owner, name] = fullName.split("/");
  let info;
  try {
    ({ data: info } = await octokit.rest.repos.get({ owner, repo: name }));
  } catch (err) {
    throw ghError(err, `Cannot access ${fullName}`);
  }
  let repoDoc = await Repository.findOne({ fullNameLower: info.full_name.toLowerCase() });
  if (repoDoc && repoDoc.connectedBy && String(repoDoc.connectedBy) !== String(userId)) {
    throw new HttpError(409, `${info.full_name} is already connected by another Git-Mind user`);
  }
  if (!repoDoc) repoDoc = new Repository({ name: info.name, owner: info.owner.login, url: info.html_url });
  Object.assign(repoDoc, {
    name: info.name,
    owner: info.owner.login,
    fullName: info.full_name,
    fullNameLower: info.full_name.toLowerCase(),
    githubId: info.id,
    private: info.private,
    url: info.html_url,
    defaultBranch: info.default_branch,
    connectedBy: userId,
  });
  await ensureWebhook(repoDoc, octokit);
  await repoDoc.save();
  try {
    await syncRepository(repoDoc);
  } catch (err) {
    repoDoc.syncError = err.message;
    await repoDoc.save();
  }
  return Repository.findById(repoDoc._id).select("-commits -branches").lean();
}

async function disconnectRepository(repoDoc) {
  await removeWebhook(repoDoc);
  await PullRequest.deleteMany({ repositoryId: repoDoc._id });
  await Repository.deleteOne({ _id: repoDoc._id });
}

/** Pull branches, default-branch commits and PRs from GitHub into Mongo. */
async function syncRepository(repoDoc) {
  const octokit = await repoOctokit(repoDoc);
  const { owner, name: repo } = repoDoc;
  try {
    const { data: info } = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = info.default_branch;

    const ghBranches = await octokit.paginate(octokit.rest.repos.listBranches, { owner, repo, per_page: 100 });
    const branches = await Promise.all(
      ghBranches.slice(0, 60).map(async (b) => {
        let updatedAt = null, aheadBy = null, lastAuthor = null;
        try {
          const { data: c } = await octokit.rest.repos.getCommit({ owner, repo, ref: b.commit.sha });
          updatedAt = c.commit.committer?.date || c.commit.author?.date || null;
          lastAuthor = c.author?.login || c.commit.author?.name || null;
          if (b.name !== defaultBranch) {
            const { data: cmp } = await octokit.rest.repos.compareCommits({ owner, repo, base: defaultBranch, head: b.name });
            aheadBy = cmp.ahead_by;
          }
        } catch (_) { /* partial data is fine */ }
        return { name: b.name, commitSha: b.commit.sha, isDefault: b.name === defaultBranch, protected: Boolean(b.protected), aheadBy, lastAuthor, updatedAt };
      })
    );

    let commits = [];
    try {
      const { data } = await octokit.rest.repos.listCommits({ owner, repo, sha: defaultBranch, per_page: 100 });
      commits = data.map((c) => ({
        id: c.sha,
        sha: c.sha.slice(0, 7),
        fullSha: c.sha,
        title: c.commit.message?.split("\n")[0] || "",
        message: c.commit.message,
        author: c.author?.login || c.commit.author?.name || null,
        url: c.html_url,
        branch: defaultBranch,
        createdAt: c.commit.author?.date ? new Date(c.commit.author.date) : null,
      }));
    } catch (err) {
      if (err.status !== 409) throw err; // 409 = empty repository
    }
    const def = branches.find((b) => b.isDefault);
    if (def) def.commitCount = commits.length;

    const prs = await octokit.paginate(octokit.rest.pulls.list, { owner, repo, state: "all", per_page: 100 }, (r, done) => {
      if (r.data.length && new Date(r.data[r.data.length - 1].updated_at) < Date.now() - 180 * 864e5) done();
      return r.data;
    });
    await Promise.all(
      prs.map((pr) =>
        PullRequest.findOneAndUpdate(
          { repositoryId: repoDoc._id, number: pr.number },
          {
            repositoryId: repoDoc._id,
            number: pr.number,
            title: pr.title,
            status: pr.state === "closed" ? (pr.merged_at ? "merged" : "closed") : "open",
            branch: pr.head?.ref,
            baseBranch: pr.base?.ref,
            author: pr.user?.login || null,
            url: pr.html_url,
            createdAt: new Date(pr.created_at),
            updatedAt: new Date(pr.updated_at),
          },
          { upsert: true, timestamps: false }
        )
      )
    );

    await Repository.updateOne(
      { _id: repoDoc._id },
      { $set: { branches, commits, defaultBranch, private: info.private, url: info.html_url, lastSyncedAt: new Date(), syncError: null } }
    );
    return { success: true, branches: branches.length, commits: commits.length, pullRequests: prs.length };
  } catch (err) {
    const e = ghError(err, `Sync of ${repoDoc.fullName || repo} failed`);
    await Repository.updateOne({ _id: repoDoc._id }, { $set: { syncError: e.message } });
    throw e;
  }
}

async function mergePullRequest(repoDoc, number) {
  const octokit = await repoOctokit(repoDoc);
  const { owner, name: repo } = repoDoc;
  const pull_number = Number(number);
  if (!Number.isInteger(pull_number)) throw new HttpError(400, "Invalid pull request number");
  try {
    const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number });
    if (pr.merged) return { merged: true, message: "Already merged" };
    if (pr.state === "closed") throw new HttpError(409, `PR #${pull_number} is closed`);
    if (pr.mergeable === false) throw new HttpError(409, `PR #${pull_number} has merge conflicts with ${pr.base.ref}`);
    const { data } = await octokit.rest.pulls.merge({ owner, repo, pull_number, merge_method: "merge" });
    await PullRequest.updateOne({ repositoryId: repoDoc._id, number: pull_number }, { $set: { status: "merged" } });
    syncRepository(repoDoc).catch(() => {});
    return { merged: data.merged, message: data.message, sha: data.sha };
  } catch (err) {
    throw ghError(err, `Merge of #${pull_number} failed`);
  }
}

async function deleteBranch(repoDoc, branchName) {
  const name = String(branchName || "").trim().replace(/^refs\/heads\//, "");
  if (!name) throw new HttpError(400, "Branch name required");
  if (name === repoDoc.defaultBranch || ["main", "master", "develop", "production"].includes(name)) {
    throw new HttpError(400, `Refusing to delete protected branch ${name}`);
  }
  const octokit = await repoOctokit(repoDoc);
  try {
    await octokit.rest.git.deleteRef({ owner: repoDoc.owner, repo: repoDoc.name, ref: `heads/${name}` });
  } catch (err) {
    throw ghError(err, `Delete of ${name} failed`);
  }
  await Repository.updateOne({ _id: repoDoc._id }, { $pull: { branches: { name } } });
  return { deleted: name };
}

/** Which scopes the user's token actually has (from GitHub's X-OAuth-Scopes header). */
async function tokenInfo(userId) {
  const octokit = await userOctokit(userId);
  const r = await octokit.request("GET /user");
  return { login: r.data.login, scopes: String(r.headers["x-oauth-scopes"] || "").split(",").map((s) => s.trim()).filter(Boolean) };
}

module.exports = {
  HttpError,
  userOctokit,
  listUserGithubRepos,
  connectRepository,
  disconnectRepository,
  syncRepository,
  mergePullRequest,
  deleteBranch,
  ensureWebhook,
  tokenInfo,
  webhookUrl,
};

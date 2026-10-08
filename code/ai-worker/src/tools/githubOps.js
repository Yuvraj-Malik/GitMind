const _sg = require("simple-git");
const simpleGit = _sg.simpleGit || _sg.default || _sg; // v3 and v4 export shapes
const path = require("path");
const fs = require("fs");
const { Octokit } = require("@octokit/rest");
const { isTestFile, AI_FIX_BRANCH_PREFIX } = require("shared");
const config = require("../config");
const { scrubToken, tail } = require("./shell");

/** Error carrying the pipeline stage it failed in and whether the fixer may retry. */
class FixerError extends Error {
  constructor(stage, message, { retryable = false } = {}) {
    super(message);
    this.stage = stage;
    this.retryable = retryable;
  }
}

function isWithin(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** Git ops are only allowed inside the fixture repo, TEST_REPO_PATH, or the worker's clone dir. */
function assertAllowedRepoDir(repoDir) {
  const roots = [config.FIXTURE_REPO, config.workspacesDir];
  if (process.env.TEST_REPO_PATH) roots.push(path.resolve(process.env.TEST_REPO_PATH));
  if (!roots.some((r) => isWithin(r, repoDir))) {
    throw new FixerError("safety_guard", `SAFETY GUARD: refusing git ops outside allowed repos. Target was: ${repoDir}`);
  }
}

/**
 * Validates the model's proposed files before anything touches disk.
 * - only files we offered as editable may change (blocks prompt-injected writes elsewhere)
 * - test files may never change (the scoped "gamed patch" check)
 */
function validatePatchFiles(patchFiles, allowedFiles) {
  const allowed = new Set((allowedFiles || []).map((f) => f.replace(/\\/g, "/")));
  for (const f of patchFiles) {
    const p = f.filepath.replace(/\\/g, "/");
    if (isTestFile(p)) {
      throw new FixerError("verification", `Rejected patch: it modifies test file ${p}. Fix the source code, never the tests.`, { retryable: true });
    }
    if (allowed.size > 0 && !allowed.has(p)) {
      throw new FixerError("verification", `Rejected patch: ${p} is not one of the files you may modify (${[...allowed].join(", ")}).`, { retryable: true });
    }
  }
}

async function checkoutBase(git, baseRef) {
  try {
    await git.checkout(baseRef);
  } catch (e) {
    if (baseRef === "main") await git.checkout("master");
    else throw e;
  }
}

/** Fails fast with a clear message when the token is missing/expired, before the LLM is even called. */
async function preflightGithub({ owner, repo, token = process.env.GITHUB_TOKEN }) {
  if (!token || !owner || !repo) {
    throw new FixerError("pr_config_missing", "PR_CONFIG_MISSING: GITHUB_TOKEN, owner or repo not configured");
  }
  const octokit = new Octokit({ auth: token });
  try {
    await octokit.rest.repos.get({ owner, repo });
  } catch (err) {
    const hint = err.status === 401 ? " (token expired or revoked: regenerate GITHUB_TOKEN)" : err.status === 404 ? " (token lacks access to this repo)" : "";
    throw new FixerError("github_auth", `GitHub preflight failed: ${err.status || ""} ${err.message}${hint}`);
  }
}

/**
 * Apply patch on a fresh ai/fix-* branch, verify, commit, push, open PR.
 * Nothing is committed unless verify() passes; on any failure the working tree is restored.
 */
async function createFixBranchAndCommit({
  prNumber,
  patchProposal,
  repoDir = config.sandboxRepo,
  baseRef = config.baseBranch,
  prBase = config.baseBranch,
  owner = process.env.GITHUB_REPO_OWNER,
  repo = process.env.GITHUB_REPO_NAME,
  allowedFiles,
  verify,
  push = true,
  token = process.env.GITHUB_TOKEN,
}) {
  repoDir = path.resolve(repoDir);
  assertAllowedRepoDir(repoDir);
  if (typeof verify !== "function") throw new FixerError("validation", "verify() function is required");

  const filesToPatch = patchProposal?.files || [];
  if (filesToPatch.length === 0) throw new FixerError("llm_generation", "Patch contains no files", { retryable: true });
  validatePatchFiles(filesToPatch, allowedFiles);

  const git = simpleGit(repoDir);
  if (!(await git.checkIsRepo())) {
    throw new FixerError("validation", `${repoDir} is not a git repository`);
  }
  await checkoutBase(git, baseRef);

  const branch = `${AI_FIX_BRANCH_PREFIX}pr-${prNumber || "manual"}-${Date.now()}`;
  await git.checkoutLocalBranch(branch);

  const originals = [];
  let verifyOutput = "";
  try {
    for (const file of filesToPatch) {
      const fullPath = path.resolve(repoDir, file.filepath);
      if (!isWithin(repoDir, fullPath) || fullPath === repoDir) {
        throw new FixerError("safety_guard", `SAFETY GUARD: Path traversal detected: ${file.filepath}`);
      }
      originals.push({ path: fullPath, content: fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : null });
      let content = file.content;
      if (!content.endsWith("\n")) content += "\n";
      fs.writeFileSync(fullPath, content);
    }

    const diff = await git.diff(["--stat"]);
    if (!diff.trim()) {
      throw new FixerError("verification", "Patch made no changes to the files.", { retryable: true });
    }

    const result = await verify(repoDir);
    verifyOutput = result.output || "";
    if (!result.ok) {
      throw new FixerError("verification", `Verification failed:\n${tail(verifyOutput, 2500)}`, { retryable: true });
    }

    for (const file of filesToPatch) await git.add(file.filepath);
    await git.commit(`fix: ${patchProposal.summary || `automated fix for PR #${prNumber || "manual"}`}`.slice(0, 200));
  } catch (e) {
    for (const o of originals) {
      if (o.content !== null) fs.writeFileSync(o.path, o.content);
      else if (fs.existsSync(o.path)) fs.unlinkSync(o.path);
    }
    try {
      await checkoutBase(git, baseRef);
      await git.deleteLocalBranch(branch, true);
    } catch (_) { /* best effort */ }
    if (e instanceof FixerError) throw e;
    throw new FixerError("verification", e.message, { retryable: true });
  }

  if (!push) {
    await checkoutBase(git, baseRef);
    return { branch, pushSuccess: false, prUrl: null, patchProposal };
  }

  if (!token || !owner || !repo) {
    throw new FixerError("pr_config_missing", "PR_CONFIG_MISSING: GitHub PR credentials not configured");
  }

  let pushSuccess = false;
  try {
    const pushUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
    await git.push(pushUrl, `${branch}:refs/heads/${branch}`);
    pushSuccess = true;

    const octokit = new Octokit({ auth: token });
    const body = [
      `**Automated fix proposed by Git-Mind.** A human must review before merging; Git-Mind never merges.`,
      "",
      `**Summary:** ${patchProposal.summary || "n/a"}`,
      prNumber ? `**Fixes failing checks on:** #${prNumber}` : "",
      `**Files changed:** ${filesToPatch.map((f) => "`" + f.filepath + "`").join(", ")}`,
      "",
      "<details><summary>Verification output (passing)</summary>\n\n```\n" + tail(verifyOutput, 3000) + "\n```\n</details>",
    ].filter(Boolean).join("\n");

    const pr = await octokit.rest.pulls.create({
      owner,
      repo,
      title: `[Git-Mind] ${patchProposal.summary || `Automated fix for PR #${prNumber}`}`.slice(0, 250),
      head: branch,
      base: prBase,
      body,
    });
    return { branch, pushSuccess, prUrl: pr.data.html_url, prNumberCreated: pr.data.number, patchProposal };
  } catch (err) {
    throw new FixerError("pr_creation", `Push or PR creation failed (pushed=${pushSuccess}): ${scrubToken(err.message)}`);
  } finally {
    try { await checkoutBase(git, baseRef); } catch (_) { /* ignore */ }
  }
}

module.exports = { createFixBranchAndCommit, preflightGithub, validatePatchFiles, assertAllowedRepoDir, FixerError };

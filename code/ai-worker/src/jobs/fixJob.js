const fs = require("fs");
const path = require("path");
const { SOCKET_EVENTS } = require("shared");
const config = require("../config");
const { runFixerAgent } = require("../agents/fixerAgent");
const { preflightGithub, FixerError } = require("../tools/githubOps");
const { runCommand, tail } = require("../tools/shell");
const ws = require("../tools/repoWorkspace");
const { writeAILog } = require("../services/db");
const { publishEvent } = require("../services/events");

/** Manual / sandbox mode: one bugs/*.js file, its paired test as the verifier. */
async function buildManualContext(data) {
  const repoDir = config.sandboxRepo;
  const rel = data.relativeFile;
  const abs = path.resolve(repoDir, rel);
  if (!abs.startsWith(path.resolve(repoDir) + path.sep) || !fs.existsSync(abs)) {
    throw new FixerError("validation", `File not found in sandbox: ${rel}`);
  }
  const testRel = rel.replace(/\.js$/, ".test.js");
  const pre = runCommand(`node "${testRel}"`, { cwd: repoDir, timeoutMs: 60_000 });
  const editable = [rel, ...ws.localImports(repoDir, rel)];
  return {
    repoDir,
    alreadyPassing: pre.ok,
    errorLog: pre.output,
    files: editable.map((f) => ws.readFileEntry(repoDir, f)).filter(Boolean),
    contextFiles: fs.existsSync(path.resolve(repoDir, testRel)) ? [ws.readFileEntry(repoDir, testRel)] : [],
    repo: {
      dir: repoDir,
      baseRef: config.baseBranch,
      prBase: config.baseBranch,
      owner: process.env.GITHUB_REPO_OWNER,
      name: process.env.GITHUB_REPO_NAME,
    },
    verify: undefined, // paired-test verifier
  };
}

/** GitHub token to act with: the user who connected the repo, else GITHUB_TOKEN from .env. */
async function resolveToken(data) {
  if (data.repositoryId) {
    const { Repository, User, decryptSecret } = require("shared");
    const { ensureDb } = require("../services/db");
    await ensureDb();
    const repo = await Repository.findById(data.repositoryId).select("connectedBy").lean();
    const user = repo ? await User.findById(repo.connectedBy).select("accessToken").lean() : null;
    const token = decryptSecret(user?.accessToken);
    if (token) return token;
    throw new FixerError("github_auth", "The user who connected this repository has no valid GitHub session. Sign in to Git-Mind again.");
  }
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  throw new FixerError("pr_config_missing", "No GitHub token available for this repository");
}

/** Real-repo mode (webhook or manual): clone the repo at the commit, run its real test command. */
async function buildWebhookContext(data) {
  const [owner, name] = data.repoFullName.split("/");
  const token = await resolveToken(data);
  await preflightGithub({ owner, repo: name, token });
  const repoDir = await ws.prepareWorkspace({ repoFullName: data.repoFullName, headSha: data.headSha, token });
  const repoConfig = ws.readRepoConfig(repoDir);
  const testCommand = repoConfig.testCommand || config.testCommand;

  const install = ws.installDependencies(repoDir, repoConfig);
  if (!install.ok) throw new FixerError("validation", `Dependency install failed:\n${tail(install.output, 2000)}`);

  const pre = runCommand(testCommand, { cwd: repoDir, timeoutMs: config.commandTimeoutMs });
  const { files, contextFiles } = ws.selectFiles(repoDir, pre.output);
  return {
    repoDir,
    alreadyPassing: pre.ok,
    errorLog: `$ ${testCommand}\n${pre.output}`,
    files,
    contextFiles,
    repo: { dir: repoDir, baseRef: data.headSha, prBase: repoConfig.baseBranch || data.baseBranch, owner, name, token },
    verify: async (dir) => {
      const r = runCommand(testCommand, { cwd: dir, timeoutMs: config.commandTimeoutMs });
      return { ok: r.ok, output: `$ ${testCommand}\n${r.output}` };
    },
  };
}

async function finish(jobId, base, result, extra = {}) {
  const event = result.ok ? SOCKET_EVENTS.AI_FIX_COMPLETED : SOCKET_EVENTS.AI_FIX_FAILED;
  await publishEvent(event, { jobId, ...base, ...result, ...extra });
  if (result.ok && result.prUrl) {
    await publishEvent(SOCKET_EVENTS.NEW_PR_CREATED, { jobId, prUrl: result.prUrl, branch: result.branch, number: result.createdPrNumber });
    await publishEvent(SOCKET_EVENTS.NEW_NODE_ADDED, { jobId, type: "ai", branch: result.branch, prUrl: result.prUrl });
  }
  return result;
}

/** BullMQ processor for "fix-code" jobs. Always resolves (never throws) so the job never auto-retries a push. */
async function processFixJob(job) {
  const data = job.data || {};
  const jobId = job.id;
  const trigger = data.trigger || "manual";
  const base = { trigger, repoName: data.repoFullName || "sandbox", repositoryId: data.repositoryId || undefined, headSha: data.headSha, prNumber: data.prNumber };
  const started = Date.now();

  await writeAILog({ jobId, ...base, action: "Fix in progress", status: "running" });
  await publishEvent(SOCKET_EVENTS.AI_FIX_STARTED, { jobId, ...base, status: "running" });

  let ctx;
  try {
    ctx = data.repoFullName ? await buildWebhookContext(data) : await buildManualContext(data);
  } catch (err) {
    const stage = err.stage || "validation";
    const result = { ok: false, error: err.message, failed_at: stage, attempt: 0 };
    await writeAILog({ jobId, ...base, action: "Fix aborted", status: "failed", failedAt: stage, reasoning: err.message.slice(0, 1000), durationMs: Date.now() - started });
    return finish(jobId, base, result);
  }

  if (ctx.alreadyPassing) {
    const result = { ok: false, skipped: true, error: "Tests already pass locally; nothing to fix (flaky or environment-specific failure).", failed_at: "skipped" };
    await writeAILog({ jobId, ...base, action: "Fix skipped", status: "skipped", reasoning: result.error, errorLog: tail(ctx.errorLog, 8000), durationMs: Date.now() - started });
    return finish(jobId, base, result);
  }
  if (!ctx.files.length) {
    const result = { ok: false, error: "Could not locate any source file from the failing test output.", failed_at: "validation" };
    await writeAILog({ jobId, ...base, action: "Fix aborted", status: "failed", failedAt: "validation", reasoning: result.error, errorLog: tail(ctx.errorLog, 8000), durationMs: Date.now() - started });
    return finish(jobId, base, result);
  }

  const result = await runFixerAgent({
    jobId,
    repositoryId: data.repositoryId,
    prNumber: data.prNumber,
    errorLog: ctx.errorLog,
    files: ctx.files,
    contextFiles: ctx.contextFiles,
    repo: ctx.repo,
    verify: ctx.verify,
  });
  return finish(jobId, base, result);
}

module.exports = { processFixJob, buildManualContext, buildWebhookContext };

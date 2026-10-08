require("../config");
const fs = require("fs");
const path = require("path");
const { createFixBranchAndCommit, FixerError } = require("../tools/githubOps");
const { runCommand, tail } = require("../tools/shell");
const config = require("../config");

const BASE_PROMPT = fs.readFileSync(path.join(__dirname, "..", "prompts", "selfHealingPrompt.txt"), "utf8");

function defaultLlm() {
  const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
  return new ChatGoogleGenerativeAI({
    model: process.env.FIX_MODEL || "gemini-2.5-flash",
    temperature: 0,
    apiKey: process.env.GEMINI_API_KEY,
  });
}

/** Neutralise anything in untrusted output that could break our framing or extraction format. */
function sanitizeUntrusted(text) {
  return String(text || "")
    .replace(/```/g, "'''")
    .replace(/^#{3,}/gm, "#")
    .replace(/<\/?untrusted_test_output>/gi, "[tag removed]");
}

function fence(files) {
  return files.map((f) => `### ${f.filepath}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n");
}

function buildPrompt({ files, contextFiles = [], errorContext }) {
  return `${BASE_PROMPT}
FILES YOU MAY MODIFY:
${fence(files)}

READ-ONLY CONTEXT (do not modify, do not output):
${contextFiles.length ? fence(contextFiles) : "(none)"}

<untrusted_test_output>
${sanitizeUntrusted(tail(errorContext, 4000))}
</untrusted_test_output>

OUTPUT FORMAT (strict):
First line: "SUMMARY: <one sentence describing the root cause and fix>"
Then, for EACH file you change, the FULL new file content (no diffs, no snippets):

### path/to/file.js
\`\`\`javascript
<complete file content>
\`\`\`

Use exactly the paths shown above. Output only files you changed. No JSON.`;
}

function contentToString(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === "string" ? c : c?.text || "")).join("");
  return String(content || "");
}

/** Extract { summary, files[] } from the model's markdown. */
function extractPatch(text, files) {
  const out = { summary: "", files: [] };
  const sm = text.match(/^\s*SUMMARY:\s*(.+)$/im);
  if (sm) out.summary = sm[1].trim().slice(0, 180);

  const blockRegex = /###\s+`?([^\n`]+?)`?\s*\r?\n```[\w+-]*\r?\n([\s\S]*?)\r?\n```/g;
  let m;
  while ((m = blockRegex.exec(text)) !== null) {
    out.files.push({ filepath: m[1].trim().replace(/^\.\//, ""), content: m[2] });
  }
  if (out.files.length === 0 && files.length === 1) {
    const fb = text.match(/```[\w+-]*\r?\n([\s\S]*?)\r?\n```/);
    if (fb) out.files.push({ filepath: files[0].filepath, content: fb[1] });
  }
  if (!out.summary) out.summary = `Automated fix for ${out.files.map((f) => f.filepath).join(", ") || "failing tests"}`;
  return out;
}

/** Default verification for the fixture/sandbox layout: run the paired <file>.test.js with node. */
function pairedTestVerifier(files) {
  return async (repoDir) => {
    const tests = files
      .map((f) => f.filepath.replace(/\.js$/, ".test.js"))
      .filter((t) => fs.existsSync(path.resolve(repoDir, t)));
    if (tests.length === 0) return { ok: false, output: "No paired .test.js found: refusing to commit an unverified patch." };
    let output = "";
    for (const t of tests) {
      const r = runCommand(`node "${t}"`, { cwd: repoDir, timeoutMs: 60_000 });
      output += `$ node ${t}\n${r.output}\n`;
      if (!r.ok) return { ok: false, output };
    }
    return { ok: true, output };
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * payload: { prNumber, errorLog, files:[{filepath,content}], contextFiles?, repo?: {dir, baseRef, prBase, owner, name}, verify?, push? }
 * deps (for tests): { llm, createFixBranchAndCommit, sleep }
 */
async function runFixerAgentCore(payload, deps = {}) {
  const { prNumber, errorLog, files, contextFiles = [], repo = {}, push = true } = payload || {};
  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, error: "Missing files array in payload", failed_at: "validation", attempt: 0 };
  }

  const llm = deps.llm || defaultLlm();
  const commit = deps.createFixBranchAndCommit || createFixBranchAndCommit;
  const wait = deps.sleep || sleep;
  const verify = payload.verify || pairedTestVerifier(files);
  const maxAttempts = payload.maxAttempts || config.maxAttempts;

  let errorContext = errorLog || "";
  let lastError = null;
  let lastSummary = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      let text;
      try {
        const response = await llm.invoke(buildPrompt({ files, contextFiles, errorContext }));
        text = contentToString(response?.content ?? response);
      } catch (err) {
        if (/429|quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(err.message || "")) {
          // Retrying 5s later just burns more quota; surface it clearly instead.
          throw new FixerError("llm_rate_limited", `LLM quota/rate limit hit: ${String(err.message).slice(0, 300)}`);
        }
        throw new FixerError("llm_generation", `LLM call failed: ${err.message}`, { retryable: true });
      }

      const patch = extractPatch(text, files);
      if (patch.files.length === 0) {
        throw new FixerError("llm_generation", "Could not extract a code block from the LLM response", { retryable: true });
      }
      lastSummary = patch.summary;

      const result = await commit({
        prNumber,
        patchProposal: patch,
        repoDir: repo.dir,
        baseRef: repo.baseRef,
        prBase: repo.prBase,
        owner: repo.owner,
        repo: repo.name,
        allowedFiles: files.map((f) => f.filepath),
        verify,
        push,
        token: repo.token,
      });

      if (push && !result.prUrl) {
        return { ok: false, error: "PR creation did not return a URL", failed_at: "pr_creation", attempt, summary: patch.summary };
      }
      return {
        ok: true,
        prNumber,
        branch: result.branch,
        pushSuccess: result.pushSuccess,
        prUrl: result.prUrl,
        createdPrNumber: result.prNumberCreated,
        summary: patch.summary,
        files: patch.files.map((f) => f.filepath),
        attempt,
      };
    } catch (err) {
      lastError = err instanceof FixerError ? err : new FixerError("verification", err.message, { retryable: false });
      console.warn(`[fixer] attempt ${attempt}/${maxAttempts} failed at ${lastError.stage}: ${lastError.message.split("\n")[0]}`);
      if (!lastError.retryable || attempt === maxAttempts) {
        return { ok: false, error: lastError.message, failed_at: lastError.stage, attempt, summary: lastSummary };
      }
      // Feed the newest failure back so the next attempt can correct itself.
      if (lastError.stage === "verification") {
        errorContext = `Your previous patch did not pass:\n${lastError.message}\n\nOriginal failure:\n${tail(errorLog, 1500)}`;
      }
      await wait(config.retryDelayMs);
    }
  }
  return { ok: false, error: lastError?.message || "unknown", failed_at: lastError?.stage || "verification", attempt: maxAttempts };
}

/** Backwards-compatible entry point (used by scripts/validate-fixer.js, run-e2e.js). Logs every run. */
async function runFixerAgent(payload, deps) {
  const started = Date.now();
  const result = await runFixerAgentCore(payload, deps);
  if (!payload?.skipLog) {
    const { writeAILog } = require("../services/db");
    await writeAILog({
      jobId: payload?.jobId,
      repositoryId: payload?.repositoryId || undefined,
      repoName: payload?.repo?.owner ? `${payload.repo.owner}/${payload.repo.name}` : process.env.GITHUB_REPO_NAME || "unknown",
      action: result.ok ? "Fix PR opened" : "Fix attempt failed",
      reasoning: result.ok ? result.summary : `${result.summary ? result.summary + " | " : ""}${String(result.error || "").slice(0, 1000)}`,
      branch: result.branch || "",
      prUrl: result.prUrl || "",
      filePath: (payload?.files || []).map((f) => f.filepath).join(", "),
      status: result.ok ? "success" : "failed",
      failedAt: result.ok ? null : result.failed_at,
      attempt: result.attempt || 0,
      errorLog: tail(payload?.errorLog, 8000),
      durationMs: Date.now() - started,
    });
  }
  return result;
}

module.exports = { runFixerAgent, runFixerAgentCore, buildPrompt, extractPatch, sanitizeUntrusted, pairedTestVerifier };

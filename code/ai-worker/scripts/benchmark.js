/**
 * Benchmark the fixer on the 8 fixture bugs, N runs each, WITHOUT pushing anything.
 * Uses the same context-building and verification code path as the real worker.
 *
 *   node scripts/benchmark.js            # 3 runs per bug
 *   node scripts/benchmark.js 5 08 02    # 5 runs, only bugs 08 and 02
 *
 * Writes scripts/benchmark-results.md
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");

const FIXTURES = path.resolve(__dirname, "test-repo");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gitmind-bench-"));
process.env.TEST_REPO_PATH = tmp; // must be set before the worker modules load
process.env.FIX_RETRY_DELAY_MS = process.env.FIX_RETRY_DELAY_MS || "3000";

const { buildManualContext } = require("../src/jobs/fixJob");
const { runFixerAgentCore } = require("../src/agents/fixerAgent");

const runs = Number(process.argv[2] || 3);
const only = process.argv.slice(3);

fs.cpSync(path.join(FIXTURES, "bugs"), path.join(tmp, "bugs"), { recursive: true });
execSync("git init -q -b main && git config user.email bench@local && git config user.name bench && git add . && git commit -qm fixtures", { cwd: tmp });

function resetRepo() {
  execSync("git checkout -q -f main && git clean -fdq", { cwd: tmp });
  const branches = execSync("git branch --format=\"%(refname:short)\"", { cwd: tmp }).toString().split("\n").filter((b) => b.startsWith("ai/"));
  for (const b of branches) execSync(`git branch -q -D "${b}"`, { cwd: tmp });
}

(async () => {
  const bugs = fs.readdirSync(path.join(tmp, "bugs"))
    .filter((f) => /^\d\d-.*\.js$/.test(f) && !f.endsWith(".test.js"))
    .filter((f) => only.length === 0 || only.some((o) => f.startsWith(o)));

  const rows = [];
  for (const bug of bugs) {
    const outcomes = [];
    for (let i = 1; i <= runs; i++) {
      resetRepo();
      const ctx = await buildManualContext({ relativeFile: `bugs/${bug}` });
      const t0 = Date.now();
      const r = await runFixerAgentCore({
        prNumber: 0, errorLog: ctx.errorLog, files: ctx.files, contextFiles: ctx.contextFiles,
        repo: ctx.repo, push: false,
      });
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      outcomes.push({ ok: r.ok, attempt: r.attempt, failed_at: r.failed_at, secs, summary: r.summary });
      console.log(`${bug} run ${i}: ${r.ok ? "PASS" : "FAIL(" + r.failed_at + ")"} attempts=${r.attempt} ${secs}s ${r.summary || ""}`);
    }
    rows.push({ bug, outcomes });
  }
  resetRepo();

  const total = rows.reduce((n, r) => n + r.outcomes.length, 0);
  const passed = rows.reduce((n, r) => n + r.outcomes.filter((o) => o.ok).length, 0);
  let md = `# Fixer benchmark\n\nModel: ${process.env.FIX_MODEL || "gemini-2.5-flash"} (temperature 0), max ${process.env.FIX_MAX_ATTEMPTS || 3} attempts, ${runs} runs per bug, no push.\nDate: ${new Date().toISOString()}\n\n`;
  md += `**Overall: ${passed}/${total} runs passed (${((passed / total) * 100).toFixed(0)}%)**\n\n| Bug | Pass rate | Attempts used | Failures |\n|---|---|---|---|\n`;
  for (const r of rows) {
    const ok = r.outcomes.filter((o) => o.ok).length;
    md += `| ${r.bug} | ${ok}/${r.outcomes.length} | ${r.outcomes.map((o) => o.attempt).join(", ")} | ${r.outcomes.filter((o) => !o.ok).map((o) => o.failed_at).join(", ") || "-"} |\n`;
  }
  fs.writeFileSync(path.join(__dirname, "benchmark-results.md"), md);
  console.log("\n" + md);
  process.exit(0);
})();

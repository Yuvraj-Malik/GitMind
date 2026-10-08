const fs = require("fs");
const path = require("path");
const _sg = require("simple-git");
const simpleGit = _sg.simpleGit || _sg.default || _sg; // v3 and v4 export shapes
const { isTestFile } = require("shared");
const config = require("../config");
const { runCommand, scrubToken } = require("./shell");

const SOURCE_EXT = /\.(?:[cm]?[jt]sx?)$/;
const MAX_FILE_BYTES = 60 * 1024;

function authedUrl(repoFullName, token = process.env.GITHUB_TOKEN) {
  if (!token) throw new Error("PR_CONFIG_MISSING: GITHUB_TOKEN is required to clone/push target repos");
  return `https://x-access-token:${token}@github.com/${repoFullName}.git`;
}

/**
 * Clone (first time) or fetch the target repo into WORKSPACES_DIR/<owner>__<name>
 * and hard-checkout the failing commit. Returns the repo directory.
 */
async function prepareWorkspace({ repoFullName, headSha, token }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repoFullName || "")) throw new Error(`Invalid repo name: ${repoFullName}`);
  if (!/^[0-9a-f]{7,40}$/i.test(headSha || "")) throw new Error(`Invalid head sha: ${headSha}`);

  const root = config.workspacesDir;
  fs.mkdirSync(root, { recursive: true });
  const dir = path.join(root, repoFullName.replace("/", "__"));
  const url = authedUrl(repoFullName, token);

  try {
    if (!fs.existsSync(path.join(dir, ".git"))) {
      await simpleGit(root).clone(url, dir, ["--no-tags"]);
    }
    const git = simpleGit(dir);
    await git.remote(["set-url", "origin", url]); // token may have been rotated
    await git.fetch("origin", headSha);
    await git.raw(["checkout", "--force", "--detach", headSha]);
    await git.raw(["clean", "-fd", "-e", "node_modules"]);
  } catch (err) {
    throw new Error(`Workspace preparation failed: ${scrubToken(err.message)}`);
  }
  return dir;
}

/** Optional per-repo config committed in the target repo as .gitmind.json */
function readRepoConfig(repoDir) {
  const p = path.join(repoDir, ".gitmind.json");
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

function installDependencies(repoDir, repoConfig = {}) {
  let cmd = repoConfig.installCommand || config.installCommand;
  if (!cmd) {
    if (!fs.existsSync(path.join(repoDir, "package.json"))) return { ok: true, output: "no package.json" };
    cmd = fs.existsSync(path.join(repoDir, "package-lock.json")) ? "npm ci --ignore-scripts" : "npm install --ignore-scripts";
  }
  return runCommand(cmd, { cwd: repoDir, timeoutMs: config.commandTimeoutMs });
}

function insideRepo(repoDir, abs) {
  const rel = path.relative(repoDir, abs);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel) && !rel.split(path.sep).includes("node_modules");
}

function toRel(repoDir, abs) {
  return path.relative(repoDir, abs).split(path.sep).join("/");
}

/** File paths mentioned in test output (stack traces etc.), in order of first appearance. */
function filesFromOutput(repoDir, output) {
  const found = [];
  const re = /((?:[A-Za-z]:)?[\\/]?(?:[\w.@-]+[\\/])*[\w.@-]+\.(?:[cm]?[jt]sx?))(?::\d+)?/g;
  let m;
  while ((m = re.exec(String(output || ""))) !== null) {
    let candidate = m[1].replace(/^file:\/\/\/?/, "");
    const abs = path.isAbsolute(candidate) ? path.normalize(candidate) : path.resolve(repoDir, candidate);
    if (!insideRepo(repoDir, abs) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
    const rel = toRel(repoDir, abs);
    if (!found.includes(rel)) found.push(rel);
  }
  return found;
}

/** Local `require('./x')` / `import ... from '../x'` targets of a file. */
function localImports(repoDir, relFile) {
  const abs = path.resolve(repoDir, relFile);
  let src = "";
  try {
    src = fs.readFileSync(abs, "utf8");
  } catch {
    return [];
  }
  const out = [];
  const re = /(?:require\(\s*|from\s+|import\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const base = path.resolve(path.dirname(abs), m[1]);
    const candidates = [base, ...[".js", ".cjs", ".mjs", ".ts", ".jsx", ".tsx"].map((e) => base + e), path.join(base, "index.js")];
    const hit = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    if (hit && insideRepo(repoDir, hit)) {
      const rel = toRel(repoDir, hit);
      if (!out.includes(rel)) out.push(rel);
    }
  }
  return out;
}

function readFileEntry(repoDir, rel) {
  const abs = path.resolve(repoDir, rel);
  const buf = fs.readFileSync(abs);
  if (buf.length > MAX_FILE_BYTES) return null;
  return { filepath: rel, content: buf.toString("utf8") };
}

/**
 * Decide which files the model may edit and which it only gets to read.
 *  editable = non-test source files from the stack trace (or the test's imports) + their local imports
 *  context  = the failing test files (read-only, so the model sees the expected interface)
 */
function selectFiles(repoDir, output, { maxEditable = 4, maxContext = 4 } = {}) {
  const mentioned = filesFromOutput(repoDir, output).filter((f) => SOURCE_EXT.test(f));
  const tests = mentioned.filter(isTestFile);
  let sources = mentioned.filter((f) => !isTestFile(f));

  if (sources.length === 0) {
    for (const t of tests) for (const imp of localImports(repoDir, t)) if (!isTestFile(imp) && !sources.includes(imp)) sources.push(imp);
  }
  const editable = [...sources];
  for (const s of sources) for (const imp of localImports(repoDir, s)) if (!isTestFile(imp) && !editable.includes(imp)) editable.push(imp);

  return {
    files: editable.slice(0, maxEditable).map((f) => readFileEntry(repoDir, f)).filter(Boolean),
    contextFiles: tests.slice(0, maxContext).map((f) => readFileEntry(repoDir, f)).filter(Boolean),
  };
}

module.exports = {
  prepareWorkspace,
  readRepoConfig,
  installDependencies,
  filesFromOutput,
  localImports,
  selectFiles,
  readFileEntry,
};

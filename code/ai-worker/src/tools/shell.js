const { spawnSync } = require("child_process");

// Secrets the target repo's own code (tests, install scripts) must never see.
const SECRET_ENV = [
  "GITHUB_TOKEN", "GEMINI_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY",
  "JWT_SECRET", "GITHUB_WEBHOOK_SECRET", "GITHUB_CLIENT_SECRET", "MONGO_URI", "REDIS_URL",
];

function sandboxEnv() {
  const env = { ...process.env, CI: "true", FORCE_COLOR: "0" };
  for (const k of SECRET_ENV) delete env[k];
  for (const k of Object.keys(env)) if (/^VITE_FIREBASE/.test(k)) delete env[k];
  return env;
}

/** Runs a shell command and returns { ok, code, output } without throwing. */
function runCommand(command, { cwd, timeoutMs = 5 * 60 * 1000 } = {}) {
  const res = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    timeout: timeoutMs,
    env: sandboxEnv(),
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });
  let output = `${res.stdout || ""}${res.stderr || ""}`;
  if (res.error) output += `\n[git-mind] ${res.error.message}`;
  if (res.signal) output += `\n[git-mind] command killed by ${res.signal} (timeout ${timeoutMs}ms?)`;
  return { ok: res.status === 0 && !res.error, code: res.status, output };
}

/** Keep the tail of long logs: the failure is almost always at the end. */
function tail(text, max = 4000) {
  const s = String(text || "");
  return s.length <= max ? s : `...[truncated ${s.length - max} chars]...\n` + s.slice(-max);
}

function scrubToken(text) {
  return String(text || "").replace(/(https?:\/\/)[^@\s/]+@/g, "$1***@");
}

module.exports = { runCommand, tail, scrubToken, sandboxEnv };

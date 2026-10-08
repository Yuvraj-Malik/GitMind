const path = require("path");
// Load root .env (git-mind/.env) then code/.env, then cwd. Works when started from any directory.
try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(__dirname, "../../../.env"), quiet: true });
  dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });
  dotenv.config({ quiet: true });
} catch (e) {
  /* dotenv optional */
}

const FIXTURE_REPO = path.resolve(__dirname, "../scripts/test-repo");

module.exports = {
  FIXTURE_REPO,
  get workspacesDir() {
    return path.resolve(process.env.WORKSPACES_DIR || path.resolve(__dirname, "../.workspaces"));
  },
  get sandboxRepo() {
    return process.env.TEST_REPO_PATH ? path.resolve(process.env.TEST_REPO_PATH) : FIXTURE_REPO;
  },
  get baseBranch() {
    return process.env.BASE_BRANCH || "main";
  },
  get testCommand() {
    return process.env.FIX_TEST_COMMAND || "npm test";
  },
  get installCommand() {
    return process.env.FIX_INSTALL_COMMAND || "";
  },
  maxAttempts: Number(process.env.FIX_MAX_ATTEMPTS || 3),
  retryDelayMs: Number(process.env.FIX_RETRY_DELAY_MS || 5000),
  commandTimeoutMs: Number(process.env.FIX_COMMAND_TIMEOUT_MS || 5 * 60 * 1000),
};

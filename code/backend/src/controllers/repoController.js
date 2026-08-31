const { listRepositories, listRepoCommits } = require("../services/dbService");

async function getRepos(req, res) {
  const repos = await listRepositories();
  res.json(repos);
}

async function getRepoCommits(req, res) {
  const commits = await listRepoCommits(req.params.id);
  res.json(commits);
}

const { runFixerAgent } = require("ai-worker/src/agents/fixerAgent");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

async function triggerFix(req, res) {
  try {
    const { filePath, prNumber } = req.body;
    const bugsDir = process.env.TEST_REPO_PATH
      ? path.join(process.env.TEST_REPO_PATH, "bugs")
      : path.resolve(__dirname, "../../../ai-worker/scripts/test-repo/bugs");
    
    // Support "bugs/filename" or just "filename"
    const basename = filePath.replace(/^bugs\//, '');
    const absolutePath = path.join(bugsDir, basename);
    
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "File not found: " + absolutePath });
    }

    const content = fs.readFileSync(absolutePath, "utf8");
    let errorLog = "";
    try {
      const testPath = absolutePath.replace('.js', '.test.js');
      if (fs.existsSync(testPath)) {
        execSync(`node "${testPath}"`, { stdio: 'pipe' });
      }
    } catch (e) {
      errorLog = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '') + e.message;
    }

    const payload = {
      prNumber: prNumber || Date.now() % 10000,
      errorLog,
      files: [{ filepath: filePath, content }]
    };

    const result = await runFixerAgent(payload);
    res.json(result);
  } catch (error) {
    console.error("Manual trigger error:", error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getRepos, getRepoCommits, triggerFix };

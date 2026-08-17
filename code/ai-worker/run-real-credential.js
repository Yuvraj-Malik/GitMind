const { runFixerAgent } = require('./src/agents/fixerAgent');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { execSync } = require('child_process');

async function testE2E() {
  const bugsDir = process.env.TEST_REPO_PATH ? path.join(process.env.TEST_REPO_PATH, 'bugs') : path.resolve(__dirname, 'scripts/test-repo/bugs');

  async function runBug() {
    console.log(`\n--- Running E2E for all files in sandbox ---`);
    
    const bugFiles = ['02-off-by-one.js'];
    const files = [];
    
    for (const file of bugFiles) {
      const filePath = path.join(bugsDir, file);
      if (fs.existsSync(filePath)) {
        files.push({ filepath: `bugs/${file}`, content: fs.readFileSync(filePath, 'utf8') });
      }
    }

    let initialError = '';
    try {
      execSync(`node "${path.join(bugsDir, bugFiles[0].replace('.js', '.test.js'))}"`, { stdio: 'pipe' });
    } catch (e) {
      initialError = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '') + e.message;
    }

    const payload = {
      prNumber: 5,
      errorLog: initialError,
      files: files
    };

    const result = await runFixerAgent(payload);
    console.log("=== RAW JSON RESULT ===");
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // Cross-file bug
  await runBug();
}

testE2E().catch(console.error);

const { runFixerAgent } = require('./src/agents/fixerAgent');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function testE2E() {
  const bugsDir = path.resolve(__dirname, 'scripts/test-repo/bugs');

  async function runBug(bugFileName) {
    console.log(`\n--- Running E2E for ${bugFileName} ---`);
    const bugFilePath = path.join(bugsDir, bugFileName);
    const testFilePath = bugFilePath.replace('.js', '.test.js');
    const originalContent = fs.readFileSync(bugFilePath, 'utf8');

    let initialError = '';
    try {
      execSync(`node "${testFilePath}"`, { stdio: 'pipe' });
    } catch (e) {
      initialError = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '') + e.message;
    }

    const payload = {
      prNumber: 999, // dummy PR
      errorLog: initialError,
      brokenFilePath: `bugs/${bugFileName}`,
      brokenFileContent: originalContent
    };

    const result = await runFixerAgent(payload);
    console.log("Result:", JSON.stringify(result, null, 2));
    
    // Restore the file to original state if it was mutated
    if (fs.existsSync(bugFilePath)) {
       fs.writeFileSync(bugFilePath, originalContent);
    }
  }

  // Passing bugs
  await runBug('02-off-by-one.js');
  await runBug('06-misleading-comment.js');
  
  // Failing bug
  await runBug('08-stateful-bug.js');
}

testE2E().catch(console.error);

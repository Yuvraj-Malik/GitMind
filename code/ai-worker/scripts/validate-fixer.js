const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");

// Load .env if it exists
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
} catch(e) {}

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash", // Use a fast gemini model
  temperature: 0,
  apiKey: process.env.GEMINI_API_KEY, 
});

async function runValidation() {
  const bugsDir = path.join(__dirname, 'test-repo', 'bugs');
  const files = fs.readdirSync(bugsDir);
  const bugFiles = files.filter(f => f.match(/^\d+.*\.js$/) && !f.endsWith('.test.js'));
  const promptText = fs.readFileSync(path.join(__dirname, '..', 'src', 'prompts', 'selfHealingPrompt.txt'), 'utf8');

  // Enhance prompt to ask for RAW code inside javascript markdown blocks rather than JSON. 
  // This avoids JSON parsing issues and is simpler for the LLM to output reliably.
  const enhancedPrompt = promptText + "\n\nCRITICAL: DO NOT output JSON. Instead, output the FULL complete new code of the file inside a ```javascript block. Do not use diffs or snippets.\n\nError Context:\n{errorContext}\n\nFile Content:\n{fileContent}";

  const prompt = PromptTemplate.fromTemplate(enhancedPrompt);

  const results = [];

  for (const bugFile of bugFiles) {
    const testFile = bugFile.replace('.js', '.test.js');
    const bugFilePath = path.join(bugsDir, bugFile);
    const testFilePath = path.join(bugsDir, testFile);

    const originalContent = fs.readFileSync(bugFilePath, 'utf8');

    let initialError = '';
    try {
      execSync(`node "${testFilePath}"`, { stdio: 'pipe' });
      console.log(`❌ Sanity check failed: ${bugFile} did not fail initially!`);
      continue;
    } catch (e) {
      initialError = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '') + e.message;
    }

    let passed = false;
    let finalGamed = false;
    let finalDiff = '';
    let finalCategory = getCategory(bugFile);
    let lastErrorMsg = '';

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Fixing ${bugFile} (Attempt ${attempt}/3)...`);
      const chain = prompt.pipe(llm);
      
      let patch = null;
      try {
        const response = await chain.invoke({
          errorContext: initialError.substring(0, 2000),
          fileContent: originalContent
        });
        
        const contentStr = response.content;
        
        // Extract javascript block instead of JSON
        const match = contentStr.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          patch = match[1].trim();
        } else {
          // Fallback if they didn't use the block
          patch = contentStr.replace(/```(?:javascript|js)?/g, '').replace(/```/g, '').trim();
        }
        
        if (typeof patch !== 'string' || patch.length === 0) {
          throw new Error("Could not extract string patch from LLM response");
        }
      } catch (e) {
        console.error(`LLM call failed for ${bugFile}:`, e.message);
        lastErrorMsg = e.message;
        finalDiff = e.message;
        // Wait 5 seconds before retry due to low rate limits
        await new Promise(r => setTimeout(r, 5000));
        continue; 
      }

      // Apply Patch to original file
      fs.writeFileSync(bugFilePath, patch);

      // Re-run Test
      try {
        execSync(`node "${testFilePath}"`, { stdio: 'pipe' });
        passed = true;
      } catch (e) {
        passed = false;
        lastErrorMsg = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '') + e.message;
      }

      // Restore Original
      fs.writeFileSync(bugFilePath, originalContent);

      finalDiff = patch;
      if (passed) {
        finalGamed = checkGamed(patch, bugFile);
        console.log(`✅ Attempt ${attempt} succeeded!`);
        break; // Success! No need to retry.
      } else {
        console.log(`❌ Attempt ${attempt} failed.`);
      }
      
      // Wait 5 seconds before retry due to low rate limits
      await new Promise(r => setTimeout(r, 5000));
    }

    results.push({
      bugId: bugFile,
      category: finalCategory,
      pass: passed ? 'Pass' : (lastErrorMsg.includes('JSON') || lastErrorMsg.includes('extract string')) ? 'Fail (LLM Error)' : 'Fail',
      gamed: finalGamed,
      diff: finalDiff 
    });
    
    // Wait 5 seconds between files to respect Gemini limits
    await new Promise(r => setTimeout(r, 5000));
  }

  let table = "| Bug ID | Category | Status | Gamed? | Notes |\n|---|---|---|---|---|\n";
  for (const r of results) {
    const diffTrunc = r.diff.replace(/\\n/g, ' ').substring(0, 100);
    table += `| ${r.bugId} | ${r.category} | ${r.pass} | ${r.gamed ? '⚠️ Yes' : 'No'} | \`${diffTrunc}...\` |\n`;
  }

  const outPath = path.join(__dirname, 'validation-results.md');
  fs.writeFileSync(outPath, table);
  console.log("\\n" + table);
  console.log(`Results written to ${outPath}`);
}

function getCategory(filename) {
  if (filename.includes('trivial')) return 'trivial';
  if (filename.includes('off-by-one')) return 'reasoning';
  if (filename.includes('logic-bug')) return 'reasoning';
  if (filename.includes('array-method')) return 'reasoning';
  if (filename.includes('cross-file')) return 'cross-file';
  if (filename.includes('misleading')) return 'misleading-context';
  if (filename.includes('wrong-error')) return 'reasoning';
  if (filename.includes('stateful')) return 'stateful';
  return 'unknown';
}

function checkGamed(code, filename) {
  if (code.includes("80") && filename.includes('logic-bug')) return true;
  if (code.includes("Alice")) return true;
  if (code.includes("userId: 5")) return true;
  if (code.includes("ENOENT")) return true;
  return false;
}

runValidation().catch(console.error);

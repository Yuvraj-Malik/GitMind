const fs = require("fs");
const path = require("path");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { createFixBranchAndCommit } = require("../tools/githubOps");

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
} catch(e) {}

async function runFixerAgentCore(payload) {
  const { prNumber, errorLog, files } = payload || {};

  if (!files || !Array.isArray(files) || files.length === 0) {
    return { ok: false, error: "Missing files array in payload", failed_at: 'validation' };
  }

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    apiKey: process.env.GEMINI_API_KEY, 
  });

  const promptText = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'selfHealingPrompt.txt'), 'utf8');
  const enhancedPrompt = promptText + `

CRITICAL: DO NOT output JSON. You will receive the content of one or more files. 
You must output the FULL complete new code for each file you modify using the following format:

### path/to/file.extension
\`\`\`language
// full complete new code for file.extension
\`\`\`

You must include the ### filepath header before each code block. Do not use diffs or snippets. You MUST output a complete code block for EVERY file provided to you, applying fixes for any syntax, logic, or missing implementation errors you find in them.

Error Context:
{errorContext}

Files:
{fileContent}`;
  
  const prompt = PromptTemplate.fromTemplate(enhancedPrompt);
  
  let patchProposal = { files: [], summary: 'Fix applied' };
  let currentErrorContext = (errorLog || "").substring(0, 2000);
  let result = null;
  let finalError = null;
  
  const fileContentString = files.map(f => `### ${f.filepath}\n\`\`\`javascript\n${f.content}\n\`\`\``).join('\n\n');

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const chain = prompt.pipe(llm);
      const response = await chain.invoke({
        errorContext: currentErrorContext,
        fileContent: fileContentString
      });

      const contentStr = response.content;
      console.log("=== LLM OUTPUT ===\n" + contentStr + "\n==================");
      
      patchProposal = {
        files: [],
        summary: `Fix applied in attempt ${attempt}`
      };
      
      const blockRegex = /###\s+(.+)\r?\n```[a-z]*\r?\n([\s\S]*?)\r?\n```/gi;
      let match;
      while ((match = blockRegex.exec(contentStr)) !== null) {
        patchProposal.files.push({
          filepath: match[1].trim(),
          content: match[2].trim()
        });
      }
      
      if (patchProposal.files.length === 0) {
        const fallbackMatch = contentStr.match(/```[a-z]*\r?\n([\s\S]*?)\r?\n```/i);
        if (fallbackMatch && files.length === 1) {
          patchProposal.files.push({
            filepath: files[0].filepath,
            content: fallbackMatch[1].trim()
          });
        }
      }

      if (patchProposal.files.length === 0) {
        throw new Error("Could not extract string patch from LLM response");
      }

      // Try applying and verifying the patch
      result = await createFixBranchAndCommit({ prNumber, patchProposal });
      
      // If we reach here and it was successful, we only return ok: true if the PR was actually created
      if (!result.prUrl) {
         return { ok: false, error: 'PR creation did not return a URL', failed_at: 'pr_creation', attempt };
      }
      
      return { 
        ok: true, 
        prNumber, 
        branch: result.branch, 
        pushSuccess: result.pushSuccess,
        prUrl: result.prUrl,
        attempt
      };

    } catch (err) {
      finalError = err.message;
      if (err.message.includes('Verification failed') || err.message.includes('Could not extract string patch from LLM response')) {
         if (err.message.includes('Verification failed')) {
            currentErrorContext = err.message.substring(0, 2000);
         }
         await new Promise(r => setTimeout(r, 5000));
      } else {
         break;
      }
    }
  }

  // If we reach here, either 3 attempts failed or we broke out early
  let failedAt = 'verification';
  if (finalError) {
    if (finalError.includes('PR_CONFIG_MISSING')) failedAt = 'pr_config_missing';
    else if (finalError.includes('Push or PR creation failed')) failedAt = 'pr_creation';
    else if (finalError.includes('SAFETY GUARD')) failedAt = 'safety_guard';
  } else if (!patchProposal || patchProposal.files.length === 0) {
    failedAt = 'llm_generation';
  }

  return { ok: false, error: `Agent failed: ${finalError}`, failed_at: failedAt, attempt: 3 };
}

const { writeAILog } = require('../services/db');

async function runFixerAgent(payload) {
  const result = await runFixerAgentCore(payload);
  
  // Log to DB
  const filesList = payload?.files?.map(f => f.filepath).join(', ') || '';
  
  const logData = {
    repoName: process.env.GITHUB_REPO_NAME || 'unknown',
    branch: result.branch || '',
    prUrl: result.prUrl || '',
    filePath: filesList,
    status: result.ok ? 'success' : 'failed',
    failedAt: result.ok ? null : result.failed_at,
    attempt: result.attempt || 1
  };
  
  await writeAILog(logData);
  
  return result;
}

module.exports = { runFixerAgent };

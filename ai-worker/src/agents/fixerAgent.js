const fs = require("fs");
const path = require("path");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { createFixBranchAndCommit } = require("../tools/githubOps");

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
} catch(e) {}

async function runFixerAgent(payload) {
  const { prNumber, errorLog, brokenFilePath, brokenFileContent } = payload || {};

  if (!brokenFilePath || !brokenFileContent) {
    return { ok: false, error: "Missing broken file path or content", failed_at: 'validation' };
  }

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    apiKey: process.env.GEMINI_API_KEY, 
  });

  const promptText = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'selfHealingPrompt.txt'), 'utf8');
  const enhancedPrompt = promptText + "\n\nCRITICAL: DO NOT output JSON. Instead, output the FULL complete new code of the file inside a ```javascript block. Do not use diffs or snippets.\n\nError Context:\n{errorContext}\n\nFile Content:\n{fileContent}";
  
  const prompt = PromptTemplate.fromTemplate(enhancedPrompt);
  
  let patch = null;
  let currentErrorContext = (errorLog || "").substring(0, 2000);
  let result = null;
  let finalError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const chain = prompt.pipe(llm);
      const response = await chain.invoke({
        errorContext: currentErrorContext,
        fileContent: brokenFileContent
      });

      const contentStr = response.content;
      const match = contentStr.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/);
      
      if (match && match[1]) {
        patch = match[1].trim();
      } else {
        patch = contentStr.replace(/```(?:javascript|js)?/g, '').replace(/```/g, '').trim();
      }
      
      if (typeof patch !== 'string' || patch.length === 0) {
        throw new Error("Could not extract string patch from LLM response");
      }
      
      const patchProposal = {
        filepath: brokenFilePath,
        content: patch,
        summary: `Fix applied in attempt ${attempt}`
      };

      // Try applying and verifying the patch
      result = await createFixBranchAndCommit({ prNumber, patchProposal });
      
      // If we reach here and it was successful, we only return ok: true if the PR was actually created
      if (!result.prUrl) {
         // Should not happen normally because of the PR_CONFIG_MISSING throw, but just in case
         return { ok: false, error: 'PR creation did not return a URL', failed_at: 'pr_creation' };
      }
      
      return { 
        ok: true, 
        prNumber, 
        branch: result.branch, 
        pushSuccess: result.pushSuccess,
        prUrl: result.prUrl 
      };

    } catch (err) {
      finalError = err.message;
      if (err.message.includes('Verification failed')) {
         // Feed this new failure into next attempt
         currentErrorContext = err.message.substring(0, 2000);
         await new Promise(r => setTimeout(r, 5000));
      } else {
         // Non-verification errors should short-circuit the loop (e.g. config missing, auth failed)
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
  } else if (!patch) {
    failedAt = 'llm_generation';
  }

  return { ok: false, error: `Agent failed: ${finalError}`, failed_at: failedAt };
}

module.exports = { runFixerAgent };

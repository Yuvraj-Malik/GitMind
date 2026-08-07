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
      } else {
         // For other errors, keep original error context but we still retry
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // If we reach here, 3 attempts failed
  let failedAt = 'verification';
  if (finalError && finalError.includes('Push or PR creation failed')) failedAt = 'pr_creation';
  else if (!patch) failedAt = 'llm_generation';

  return { ok: false, error: `Agent failed after 3 attempts: ${finalError}`, failed_at: failedAt };
}

module.exports = { runFixerAgent };

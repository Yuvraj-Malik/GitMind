const fs = require('fs');
const path = require('path');
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash", 
  temperature: 0,
  apiKey: process.env.GEMINI_API_KEY, 
});

async function test08() {
  const bugsDir = path.join(__dirname, 'test-repo', 'bugs');
  const bugFile = '08-stateful-bug.js';
  const originalContent = fs.readFileSync(path.join(bugsDir, bugFile), 'utf8');
  
  const promptText = fs.readFileSync(path.join(__dirname, '..', 'src', 'prompts', 'selfHealingPrompt.txt'), 'utf8');
  const enhancedPrompt = promptText + "\n\nCRITICAL: DO NOT output JSON. Instead, output the FULL complete new code of the file inside a ```javascript block. Do not use diffs or snippets.\n\nError Context:\n{errorContext}\n\nFile Content:\n{fileContent}";
  
  const prompt = PromptTemplate.fromTemplate(enhancedPrompt);
  
  // Fake the error that 08 emits during initial run
  // Test asserts: res1.data === test, but 08 test asserts getNextId() === 1, getNextId() === 2, then requires fresh reset.
  const initialError = "AssertionError [ERR_ASSERTION]: Should have a way to reset state for isolation\nExpected: 1\nActual: 3";
  
  const chain = prompt.pipe(llm);
  const response = await chain.invoke({
    errorContext: initialError,
    fileContent: originalContent
  });
  
  console.log("=== GEMINI RAW OUTPUT ===");
  console.log(response.content);
  console.log("=========================");
}

test08().catch(console.error);

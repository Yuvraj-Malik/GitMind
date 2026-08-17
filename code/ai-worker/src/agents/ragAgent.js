const { vectorSearch } = require("../vector-store/search");

async function runRagAgent(payload) {
  const question = payload?.question || "";
  const matches = await vectorSearch(question);

  // TODO: pass matches into model with prompt template and return cited answer.
  return {
    answer: "RAG pipeline placeholder response.",
    citations: matches.slice(0, 3),
  };
}

module.exports = { runRagAgent };

async function vectorSearch(query) {
  // TODO: replace with Qdrant/pgvector similarity search.
  return [
    {
      id: "sample-citation-1",
      filePath: "src/example.js",
      snippet: `Result for query: ${query}`,
      score: 0.42,
    },
  ];
}

module.exports = { vectorSearch };

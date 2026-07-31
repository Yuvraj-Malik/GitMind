async function embedChunks(chunks) {
  // TODO: replace with embedding model call.
  return chunks.map((chunk) => ({
    ...chunk,
    vector: [0.0, 0.0, 0.0],
  }));
}

module.exports = { embedChunks };

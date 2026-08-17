async function chunkCodeBySymbols(fileText) {
  // TODO: integrate Tree-sitter parser and return semantic chunks by function/class.
  return fileText
    .split("\n\n")
    .filter(Boolean)
    .map((chunk, index) => ({ id: `chunk-${index}`, text: chunk }));
}

module.exports = { chunkCodeBySymbols };

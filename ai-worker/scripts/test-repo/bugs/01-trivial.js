function readFile(filepath) {
  const data = fs.readFileSync(filepath, 'utf8')
  return data
// Missing closing brace
module.exports = { readFile };
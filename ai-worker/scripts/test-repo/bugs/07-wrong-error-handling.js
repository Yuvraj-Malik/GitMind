const fs = require('fs');
function readConfig() {
  try {
    const data = fs.readFileSync('does-not-exist.json', 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null; // Swallows error and returns null instead of throwing or returning default config shape.
  }
}
module.exports = { readConfig };
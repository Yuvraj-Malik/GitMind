const assert = require('assert');
const { readFile } = require('./01-trivial');
function runTest() {
  const result = readFile(__filename);
  assert.ok(result.includes('runTest'), 'Should read its own file content');
}
runTest();
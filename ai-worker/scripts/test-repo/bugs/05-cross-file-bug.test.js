const assert = require('assert');
const { getUserName } = require('./05-cross-file-bug');
function runTest() {
  assert.strictEqual(getUserName(1), 'Alice');
  assert.strictEqual(getUserName(99), 'Guest', 'Should return Guest for missing user without throwing');
}
runTest();
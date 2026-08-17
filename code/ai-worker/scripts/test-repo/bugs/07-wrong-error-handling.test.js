const assert = require('assert');
const { readConfig } = require('./07-wrong-error-handling');
function runTest() {
  let threw = false;
  try {
    readConfig();
  } catch (err) {
    threw = true;
    assert.ok(err.code === 'ENOENT' || err.message.includes('ENOENT'), 'Error should be propagated');
  }
  assert.ok(threw, 'Function must propagate the file read error');
}
runTest();
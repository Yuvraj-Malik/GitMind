const assert = require('assert');
const { formatUser } = require('./06-misleading-comment');
function runTest() {
  const result = formatUser({ id: 5, name: 'Bob' });
  assert.deepStrictEqual(result, { userId: 5, userName: 'Bob' }, 'Should return mapped object, ignoring the stale comment');
}
runTest();
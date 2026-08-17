const assert = require('assert');
const { sumArray } = require('./02-off-by-one');
function runTest() {
  const result = sumArray([1, 2, 3]);
  assert.strictEqual(result, 6, 'Should sum array correctly without adding NaN/undefined');
}
runTest();
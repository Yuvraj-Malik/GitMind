const assert = require('assert');
const { calculateDiscount } = require('./03-logic-bug');
function runTest() {
  const result = calculateDiscount(100, 20);
  assert.strictEqual(result, 80, '100 with 20% discount should be 80');
}
runTest();
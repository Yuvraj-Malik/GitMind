const assert = require('assert');
// Bug: state is preserved across imports/tests. Needs a factory or reset.
const { getNextId } = require('./08-stateful-bug');
function runTest() {
  assert.strictEqual(getNextId(), 1);
  assert.strictEqual(getNextId(), 2);
  // Next test case wants a fresh start
  // But there's no way to reset. We want the fix to add a reset mechanism or return a class/factory.
  // Actually, easiest is a reset function.
  const m = require('./08-stateful-bug');
  if (m.reset) m.reset();
  assert.strictEqual(m.getNextId(), 1, 'Should have a way to reset state for isolation');
}
runTest();
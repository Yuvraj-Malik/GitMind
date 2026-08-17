const assert = require('assert');
const { getActiveUsers } = require('./04-array-method');
function runTest() {
  const users = [{id: 1, active: true}, {id: 2, active: false}, {id: 3, active: true}];
  const result = getActiveUsers(users);
  assert.deepStrictEqual(result, [{id: 1, active: true}, {id: 3, active: true}], 'Should return only active user objects');
}
runTest();
const fs = require('fs');
const path = require('path');

const bugsDir = path.join(__dirname, 'test-repo', 'bugs');
fs.mkdirSync(bugsDir, { recursive: true });

const files = {
  '01-trivial.js': `function readFile(filepath) {
  const data = fs.readFileSync(filepath, 'utf8')
  return data
// Missing closing brace
module.exports = { readFile };`,
  
  '01-trivial.test.js': `const assert = require('assert');
const { readFile } = require('./01-trivial');
function runTest() {
  const result = readFile(__filename);
  assert.ok(result.includes('runTest'), 'Should read its own file content');
}
runTest();`,

  '02-off-by-one.js': `function sumArray(arr) {
  let sum = 0;
  for (let i = 0; i <= arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}
module.exports = { sumArray };`,

  '02-off-by-one.test.js': `const assert = require('assert');
const { sumArray } = require('./02-off-by-one');
function runTest() {
  const result = sumArray([1, 2, 3]);
  assert.strictEqual(result, 6, 'Should sum array correctly without adding NaN/undefined');
}
runTest();`,

  '03-logic-bug.js': `function calculateDiscount(price, discountPercent) {
  return price + (price * (discountPercent / 100));
}
module.exports = { calculateDiscount };`,

  '03-logic-bug.test.js': `const assert = require('assert');
const { calculateDiscount } = require('./03-logic-bug');
function runTest() {
  const result = calculateDiscount(100, 20);
  assert.strictEqual(result, 80, '100 with 20% discount should be 80');
}
runTest();`,

  '04-array-method.js': `function getActiveUsers(users) {
  return users.map(u => u.active === true);
}
module.exports = { getActiveUsers };`,

  '04-array-method.test.js': `const assert = require('assert');
const { getActiveUsers } = require('./04-array-method');
function runTest() {
  const users = [{id: 1, active: true}, {id: 2, active: false}, {id: 3, active: true}];
  const result = getActiveUsers(users);
  assert.deepStrictEqual(result, [{id: 1, active: true}, {id: 3, active: true}], 'Should return only active user objects');
}
runTest();`,

  'shared-helper.js': `function fetchUserFromDB(id) {
  if (id === 1) return { id: 1, name: 'Alice' };
  throw new Error('User not found');
}
module.exports = { fetchUserFromDB };`,

  '05-cross-file-bug.js': `const { fetchUserFromDB } = require('./shared-helper');
function getUserName(id) {
  const user = fetchUserFromDB(id);
  if (!user) {
    return 'Guest';
  }
  return user.name;
}
module.exports = { getUserName };`,

  '05-cross-file-bug.test.js': `const assert = require('assert');
const { getUserName } = require('./05-cross-file-bug');
function runTest() {
  assert.strictEqual(getUserName(1), 'Alice');
  assert.strictEqual(getUserName(99), 'Guest', 'Should return Guest for missing user without throwing');
}
runTest();`,

  '06-misleading-comment.js': `// This function returns the total sum of all even numbers in the array.
function processNumbers(numbers) {
  return numbers.filter(n => n % 2 === 0).reduce((acc, n) => acc * n, 1);
}
module.exports = { processNumbers };`,

  '06-misleading-comment.test.js': `const assert = require('assert');
const { processNumbers } = require('./06-misleading-comment');
function runTest() {
  // Test asserts based on the actual needed behavior which contradicts the comment.
  // Wait, the prompt says "comment describing intended behavior is WRONG or stale; the obvious fix matching comment is incorrect, real fix requires inferring intent from usage elsewhere".
  // Let's modify the test to require the product, not the sum.
  const result = processNumbers([2, 3, 4]);
  // Expected product of even numbers: 2 * 4 = 8.
  // The bug is that if the array has no evens, reduce with 1 is fine, but if it has evens, what if it was 0? Wait, the bug is just a mismatch between comment and logic.
  // Let's make it simpler.
  assert.strictEqual(result, 8, 'Should calculate product of even numbers');
}
runTest();`,

  '07-wrong-error-handling.js': `const fs = require('fs');
function readConfig() {
  try {
    const data = fs.readFileSync('does-not-exist.json', 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null; // Swallows error and returns null instead of throwing or returning default config shape.
  }
}
module.exports = { readConfig };`,

  '07-wrong-error-handling.test.js': `const assert = require('assert');
const { readConfig } = require('./07-wrong-error-handling');
function runTest() {
  assert.throws(() => {
    const config = readConfig();
    // if readConfig returns null, config.port will crash, but the test wants it to throw during readConfig.
    if (!config) throw new Error("Config shouldn't be null, it should throw a specific error or return default.");
  }, /ENOENT/, 'Should propagate the fs error up');
}
runTest();`,

  '08-stateful-bug.js': `let cache = null;
function getCachedData(fetcher) {
  if (cache) return cache;
  cache = fetcher();
  return cache;
}
module.exports = { getCachedData };`,

  '08-stateful-bug.test.js': `const assert = require('assert');
const { getCachedData } = require('./08-stateful-bug');
function runTest() {
  let calls = 0;
  const fetcher = () => { calls++; return { data: 'test' }; };
  
  const res1 = getCachedData(fetcher);
  assert.strictEqual(res1.data, 'test');
  
  // To reset cache, the function should expose a way to do it or not use global state incorrectly, 
  // but let's say the bug is it caches across entirely different arguments/fetchers.
  const fetcher2 = () => { calls++; return { data: 'test2' }; };
  const res2 = getCachedData(fetcher2);
  
  assert.strictEqual(res2.data, 'test2', 'Should cache by fetcher identity or not share global cache for different calls');
}
runTest();`
};

// Refine 06 test
files['06-misleading-comment.js'] = `// Converts an object of {id, name} to an array of [id, name] pairs.
function formatUser(user) {
  // Bug: object doesn't have length, map won't work on object.
  // Comment says "array of [id, name] pairs" but usage in test expects { userId: id, userName: name }.
  return Object.keys(user).map(k => [k, user[k]]);
}
module.exports = { formatUser };`;

files['06-misleading-comment.test.js'] = `const assert = require('assert');
const { formatUser } = require('./06-misleading-comment');
function runTest() {
  const result = formatUser({ id: 5, name: 'Bob' });
  assert.deepStrictEqual(result, { userId: 5, userName: 'Bob' }, 'Should return mapped object, ignoring the stale comment');
}
runTest();`;

// Refine 07 test to match "code that swallows an error or returns a default/null on failure instead of propagating it"
files['07-wrong-error-handling.test.js'] = `const assert = require('assert');
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
runTest();`;

// Refine 08 test to be simpler: cache is never invalidated.
files['08-stateful-bug.js'] = `class Counter {
  constructor() { this.count = 0; }
  increment() {
    this.count++;
    return this.count;
  }
}
const globalCounter = new Counter();
function getNextId() {
  return globalCounter.increment();
}
module.exports = { getNextId };`;

files['08-stateful-bug.test.js'] = `const assert = require('assert');
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
runTest();`;


for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(bugsDir, filename), content);
}
console.log('Bugs created.');

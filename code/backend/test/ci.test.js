process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert");
const { summarize } = require("../src/services/ciService");

const run = (name, status, conclusion, start, end) => ({
  name, status, conclusion,
  startedAt: start != null ? new Date(start) : null,
  completedAt: end != null ? new Date(end) : null,
  url: `https://ci/${name}`,
});

test("no runs -> no CI summary", () => {
  assert.strictEqual(summarize([]), null);
});

test("all green -> passing with wall-clock duration", () => {
  const s = summarize([run("lint", "completed", "success", 0, 20000), run("test", "completed", "success", 5000, 65000)]);
  assert.strictEqual(s.state, "passing");
  assert.strictEqual(s.passed, 2);
  assert.strictEqual(s.durationMs, 65000);
});

test("any failure -> failing, link points at the failing check", () => {
  const s = summarize([run("lint", "completed", "success", 0, 1), run("test", "completed", "failure", 0, 2)]);
  assert.strictEqual(s.state, "failing");
  assert.strictEqual(s.failed, 1);
  assert.strictEqual(s.url, "https://ci/test");
});

test("still running -> pending, no duration yet", () => {
  const s = summarize([run("test", "in_progress", null, 0, null)]);
  assert.strictEqual(s.state, "pending");
  assert.strictEqual(s.durationMs, null);
});

test("re-runs: only the latest run of each check counts", () => {
  const s = summarize([run("test", "completed", "failure", 0, 10), run("test", "completed", "success", 100, 200)]);
  assert.strictEqual(s.state, "passing");
  assert.strictEqual(s.total, 1);
});

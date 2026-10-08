process.env.NODE_ENV = "test";
process.env.GITHUB_WEBHOOK_SECRET = "whsec_test_secret_123";
process.env.ALLOWED_REPOS = "yuvraj-malik/git-mind-test";
process.env.ALLOWED_GITHUB_USERS = "";

const test = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const env = require("../src/config/env");
const { verifyGithubSignature, computeSignature } = require("../src/webhooks/githubReceiver");
const { decideCheckRun } = require("../src/webhooks/eventRouter");
const { requireAuth, rateLimit } = require("../src/middleware/auth");

function mockRes() {
  return {
    statusCode: 200, body: null, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    set(k, v) { this.headers[k] = v; return this; },
  };
}
function mockReq({ headers = {}, rawBody, user, ip = "1.2.3.4" } = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { rawBody, user, ip, get: (h) => lower[h.toLowerCase()] };
}

test("webhook: valid signature passes", () => {
  const raw = Buffer.from(JSON.stringify({ a: 1 }));
  const req = mockReq({ rawBody: raw, headers: { "x-hub-signature-256": computeSignature(env.githubWebhookSecret, raw) } });
  let called = false;
  verifyGithubSignature(req, mockRes(), () => (called = true));
  assert.ok(called);
});

test("webhook: tampered body is rejected", () => {
  const raw = Buffer.from(JSON.stringify({ a: 1 }));
  const sig = computeSignature(env.githubWebhookSecret, raw);
  const res = mockRes();
  verifyGithubSignature(mockReq({ rawBody: Buffer.from('{"a":2}'), headers: { "x-hub-signature-256": sig } }), res, () => assert.fail("next called"));
  assert.strictEqual(res.statusCode, 401);
});

test("webhook: missing secret rejects instead of skipping verification", () => {
  const saved = env.githubWebhookSecret;
  env.githubWebhookSecret = "";
  const res = mockRes();
  verifyGithubSignature(mockReq({ rawBody: Buffer.from("{}") }), res, () => assert.fail("next called"));
  env.githubWebhookSecret = saved;
  assert.strictEqual(res.statusCode, 503);
});

const failingRun = (overrides = {}) => ({
  action: "completed",
  repository: { full_name: "Yuvraj-Malik/git-mind-test", clone_url: "https://github.com/Yuvraj-Malik/git-mind-test.git" },
  check_run: {
    id: 99, name: "test", conclusion: "failure", head_sha: "abc1234def",
    check_suite: { head_branch: "feature/x" },
    pull_requests: [{ number: 7, head: { ref: "feature/x" }, base: { ref: "main" } }],
    ...overrides,
  },
});

test("check_run failure on a feature branch is enqueued, PR targets the failing branch", () => {
  const d = decideCheckRun(failingRun());
  assert.strictEqual(d.action, "enqueue");
  assert.strictEqual(d.job.headSha, "abc1234def");
  assert.strictEqual(d.job.prNumber, 7);
  assert.strictEqual(d.job.baseBranch, "feature/x");
});

test("self-trigger guard: ai/fix-* branches never re-trigger", () => {
  const d = decideCheckRun(failingRun({ check_suite: { head_branch: "ai/fix-pr-7-123" } }));
  assert.strictEqual(d.action, "ignore");
  assert.match(d.reason, /self-trigger/);
});

test("successful checks and other repos are ignored", () => {
  assert.strictEqual(decideCheckRun(failingRun({ conclusion: "success" })).action, "ignore");
  const other = failingRun();
  other.repository.full_name = "evil/repo";
  assert.strictEqual(decideCheckRun(other).action, "ignore");
});

test("auth: missing / bad / good token", () => {
  let res = mockRes();
  requireAuth(mockReq(), res, () => assert.fail());
  assert.strictEqual(res.statusCode, 401);

  res = mockRes();
  const forged = jwt.sign({ username: "x" }, "default_super_secret_key");
  requireAuth(mockReq({ headers: { authorization: `Bearer ${forged}` } }), res, () => assert.fail());
  assert.strictEqual(res.statusCode, 401);

  const good = jwt.sign({ id: "1", username: "yuvraj" }, env.jwtSecret);
  const req = mockReq({ headers: { authorization: `Bearer ${good}` } });
  let ok = false;
  requireAuth(req, mockRes(), () => (ok = true));
  assert.ok(ok);
  assert.strictEqual(req.user.username, "yuvraj");
});

test("rate limit blocks after max requests", () => {
  const limiter = rateLimit({ max: 2, windowMs: 60_000, name: "t" });
  const req = mockReq({ user: { id: "u1" } });
  let passed = 0;
  for (let i = 0; i < 3; i++) limiter(req, mockRes(), () => passed++);
  const res = mockRes();
  limiter(req, res, () => passed++);
  assert.strictEqual(passed, 2);
  assert.strictEqual(res.statusCode, 429);
});

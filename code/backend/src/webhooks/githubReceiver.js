const crypto = require("crypto");
const env = require("../config/env");

function computeSignature(secret, rawBody) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

/**
 * Verifies X-Hub-Signature-256. The secret is mandatory: with no secret configured
 * every webhook is rejected instead of silently accepted.
 */
function verifyGithubSignature(req, res, next) {
  const secret = env.githubWebhookSecret;
  if (!secret) {
    console.error("[webhook] GITHUB_WEBHOOK_SECRET is not set; rejecting webhook.");
    return res.status(503).json({ error: "Webhook secret not configured on server" });
  }
  if (!req.rawBody) {
    return res.status(400).json({ error: "Missing raw body" });
  }

  const signature = req.get("x-hub-signature-256") || "";
  const expected = computeSignature(secret, req.rawBody);
  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return res.status(401).json({ error: "Invalid GitHub signature" });
  }
  return next();
}

module.exports = { verifyGithubSignature, computeSignature };

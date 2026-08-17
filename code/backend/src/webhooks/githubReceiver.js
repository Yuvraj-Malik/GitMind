const crypto = require("crypto");
const env = require("../config/env");

function verifyGithubSignature(req, res, next) {
  if (!env.githubWebhookSecret) {
    return next();
  }

  const signature = req.get("x-hub-signature-256") || "";
  const payload = JSON.stringify(req.body);
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", env.githubWebhookSecret)
      .update(payload)
      .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: "Invalid GitHub signature" });
  }

  return next();
}

module.exports = { verifyGithubSignature };

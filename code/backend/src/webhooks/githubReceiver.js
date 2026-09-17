const crypto = require("crypto");
const env = require("../config/env");

function verifyGithubSignature(req, res, next) {
  if (!env.githubWebhookSecret) {
    return next();
  }

  const signature = req.get("x-hub-signature-256") || "";
  const payload = req.rawBody || JSON.stringify(req.body);
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", env.githubWebhookSecret)
      .update(payload)
      .digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return res.status(401).json({ error: "Invalid GitHub signature" });
  }

  return next();
}

module.exports = { verifyGithubSignature };

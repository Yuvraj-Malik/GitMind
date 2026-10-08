const crypto = require("crypto");

// AES-256-GCM for GitHub tokens at rest. Key: TOKEN_ENCRYPTION_KEY, else derived from JWT_SECRET.
function key() {
  const material = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!material) throw new Error("TOKEN_ENCRYPTION_KEY or JWT_SECRET must be set to store GitHub tokens");
  return crypto.createHash("sha256").update(`gitmind-token:${material}`).digest();
}

function encryptSecret(plain) {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(String(plain), "utf8"), c.final()]);
  return `v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}

/** Returns null for empty, legacy plaintext, or undecryptable values (user must sign in again). */
function decryptSecret(stored) {
  if (!stored || !String(stored).startsWith("v1:")) return null;
  try {
    const [, iv, tag, data] = String(stored).split(":");
    const d = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

module.exports = { encryptSecret, decryptSecret };

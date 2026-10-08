const jwt = require("jsonwebtoken");
const env = require("../config/env");

function isUserAllowed(username) {
  if (env.allowedGithubUsers.length === 0) return true;
  return env.allowedGithubUsers.includes(String(username || "").toLowerCase());
}

/** Requires a valid `Authorization: Bearer <jwt>` issued by /auth/*. */
function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const claims = jwt.verify(token, env.jwtSecret);
    if (!isUserAllowed(claims.username)) {
      return res.status(403).json({ error: "User not allowed" });
    }
    req.user = claims;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Small in-memory fixed-window rate limiter (per user, else per IP).
 * Good enough for a single backend instance; swap for a Redis store if you scale out.
 */
function rateLimit({ windowMs = 60_000, max = 5, name = "default" } = {}) {
  const hits = new Map();
  return function rateLimiter(req, res, next) {
    const key = `${name}:${req.user?.id || req.ip}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.start + windowMs - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ error: "Too many requests", retryAfterSeconds: retryAfter });
    }
    return next();
  };
}

function isAdmin(user) {
  return Boolean(user?.username) && env.adminGithubUsers.includes(String(user.username).toLowerCase());
}

module.exports = { requireAuth, rateLimit, isUserAllowed, isAdmin };

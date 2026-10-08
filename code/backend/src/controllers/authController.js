const axios = require("axios");
const jwt = require("jsonwebtoken");
const { User, encryptSecret } = require("shared");
const env = require("../config/env");
const { isUserAllowed } = require("../middleware/auth");

const GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
// repo: read/write code + PRs on private and public repos; admin:repo_hook: install the CI webhook.
const GITHUB_SCOPES = "read:user user:email repo admin:repo_hook";

// Redirect to GitHub for login
function redirectGithub(req, res) {
  const clientId = env.githubClientId || process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send("GitHub Client ID is not configured on the server.");
  }
  const redirectUri = `${env.backendUrl.replace(/\/$/, "")}/auth/github/callback`;
  const githubAuthUrl = `${GITHUB_OAUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(GITHUB_SCOPES)}`;
  res.redirect(githubAuthUrl);
}

// Handle GitHub callback
async function handleGithubCallback(req, res) {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("No code provided");
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      GITHUB_TOKEN_URL,
      {
        client_id: env.githubClientId || process.env.GITHUB_CLIENT_ID,
        client_secret: env.githubClientSecret || process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new Error(tokenResponse.data.error_description || "Failed to get access token");
    }

    // 2. Fetch user profile
    const userResponse = await axios.get(GITHUB_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUser = userResponse.data;
    if (!isUserAllowed(githubUser.login)) {
      return res.redirect(`${env.frontendUrl.replace(/\/$/, "")}/login?error=not_allowed`);
    }

    // 3. Upsert User in DB
    let user = await User.findOne({ githubId: String(githubUser.id) });
    if (!user) {
      user = new User({
        githubId: String(githubUser.id),
        username: githubUser.login,
        avatarUrl: githubUser.avatar_url,
      });
    } else {
      user.username = githubUser.login;
      user.avatarUrl = githubUser.avatar_url;
    }
    user.accessToken = encryptSecret(accessToken);
    user.tokenScopes = userResponse.headers["x-oauth-scopes"] || "";
    await user.save();

    // 4. Issue JWT
    const token = jwt.sign(
      { id: user._id, username: user.username, avatarUrl: user.avatarUrl },
      env.jwtSecret,
      { expiresIn: "7d" }
    );

    // 5. Redirect back to frontend with token
    res.redirect(`${env.frontendUrl.replace(/\/$/, "")}/login?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error("GitHub Auth Error:", error.message);
    res.redirect(`${env.frontendUrl.replace(/\/$/, "")}/login?error=auth_failed`);
  }
}

// Handle Firebase GitHub authentication payload from client
// The client sends the GitHub OAuth access token obtained via Firebase; we ask GitHub who it belongs to.
// Nothing the browser claims about identity (username, id) is trusted.
async function handleFirebaseGithubAuth(req, res) {
  const { accessToken, firebaseUid } = req.body || {};
  if (!accessToken) {
    return res.status(400).json({ message: "Missing GitHub access token" });
  }
  try {
    const ghRes = await axios.get(GITHUB_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const gh = ghRes.data;
    if (!isUserAllowed(gh.login)) {
      return res.status(403).json({ message: `GitHub user ${gh.login} is not allowed to use this workspace` });
    }
    let user = await User.findOne({ githubId: String(gh.id) });
    if (!user) user = new User({ githubId: String(gh.id), username: gh.login });
    user.username = gh.login;
    user.avatarUrl = gh.avatar_url;
    if (firebaseUid) user.firebaseUid = firebaseUid;
    user.accessToken = encryptSecret(accessToken);
    user.tokenScopes = ghRes.headers["x-oauth-scopes"] || "";
    await user.save();

    const token = jwt.sign({ id: user._id, username: user.username, avatarUrl: user.avatarUrl }, env.jwtSecret, { expiresIn: "7d" });
    res.json({ success: true, token, user: { id: user._id, username: user.username, avatarUrl: user.avatarUrl } });
  } catch (error) {
    const status = error.response?.status === 401 ? 401 : 500;
    console.error("Firebase GitHub Auth Error:", error.message);
    res.status(status).json({ message: status === 401 ? "GitHub rejected the access token" : "Authentication failed" });
  }
}

module.exports = {
  redirectGithub,
  handleGithubCallback,
  handleFirebaseGithubAuth,
};


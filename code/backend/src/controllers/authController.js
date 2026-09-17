const axios = require("axios");
const jwt = require("jsonwebtoken");
const { User } = require("shared");
const env = require("../config/env");

const GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

// Redirect to GitHub for login
function redirectGithub(req, res) {
  const redirectUri = `${env.backendUrl.replace(/\/$/, "")}/auth/github/callback`;
  const githubAuthUrl = `${GITHUB_OAUTH_URL}?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=read:user user:email`;
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
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new Error("Failed to get access token");
    }

    // 2. Fetch user profile
    const userResponse = await axios.get(GITHUB_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUser = userResponse.data;

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
    user.accessToken = accessToken;
    await user.save();

    // 4. Issue JWT
    const jwtSecret = process.env.JWT_SECRET || "default_super_secret_key";
    const token = jwt.sign(
      { id: user._id, username: user.username, avatarUrl: user.avatarUrl },
      jwtSecret,
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
async function handleFirebaseGithubAuth(req, res) {
  const { firebaseUid, githubId, username, avatarUrl, accessToken } = req.body;

  if (!githubId && !firebaseUid) {
    return res.status(400).json({ error: "Missing required user identification (githubId or firebaseUid)" });
  }

  try {
    let query = {};
    if (githubId) {
      query = { githubId: String(githubId) };
    } else {
      query = { firebaseUid: String(firebaseUid) };
    }

    let user = await User.findOne(query);

    if (!user) {
      user = new User({
        firebaseUid: firebaseUid || undefined,
        githubId: githubId ? String(githubId) : `fb-${firebaseUid}`,
        username: username || `user-${Date.now().toString().slice(-4)}`,
        avatarUrl: avatarUrl || "",
        accessToken: accessToken || "",
      });
    } else {
      if (firebaseUid) user.firebaseUid = firebaseUid;
      if (username) user.username = username;
      if (avatarUrl) user.avatarUrl = avatarUrl;
      if (accessToken) user.accessToken = accessToken;
    }

    await user.save();

    const jwtSecret = process.env.JWT_SECRET || "default_super_secret_key";
    const token = jwt.sign(
      { id: user._id, username: user.username, avatarUrl: user.avatarUrl, firebaseUid: user.firebaseUid },
      jwtSecret,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        firebaseUid: user.firebaseUid,
      },
    });
  } catch (error) {
    console.error("Firebase GitHub Auth Error:", error);
    res.status(500).json({ error: "Authentication failed", message: error.message });
  }
}

module.exports = {
  redirectGithub,
  handleGithubCallback,
  handleFirebaseGithubAuth,
};


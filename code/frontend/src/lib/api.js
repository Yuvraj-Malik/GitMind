import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "gitmind_token";

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

const client = axios.create({ baseURL: API_URL, timeout: 20000 });

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Expired / invalid session: drop the token and go back to login.
client.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && !String(error.config?.url || "").startsWith("/auth/firebase")) {
      setToken(null);
      if (window.location.pathname !== "/login") window.location.assign("/login?error=session_expired");
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error) {
  if (!error) return "";
  if (error.code === "ERR_NETWORK") return `Cannot reach the backend at ${API_URL}. Is it running?`;
  return error.response?.data?.message || error.response?.data?.error || error.message || "Request failed";
}

const get = (url, params) => client.get(url, { params }).then((r) => r.data);
const post = (url, body) => client.post(url, body).then((r) => r.data);

const del = (url) => client.delete(url).then((r) => r.data);
const q = (repoId) => (repoId ? { repositoryId: repoId } : undefined);

export const api = {
  me: () => get("/auth/me"),
  loginWithGithubToken: (accessToken, firebaseUid) => post("/auth/firebase-github", { accessToken, firebaseUid }),
  systemStatus: () => get("/system/status"),
  notifications: () => get("/notifications"),
  markNotificationsRead: (ids) => post("/notifications/read", { ids }),

  // GitHub account + connected repositories
  githubRepos: () => get("/github/repos"),
  repos: () => get("/repos"),
  repo: (id) => get(`/repos/${id}`),
  connectRepo: (fullName) => post("/repos", { fullName }),
  disconnectRepo: (id) => del(`/repos/${id}`),
  syncRepo: (id) => post(`/repos/${id}/sync`, {}),
  retryWebhook: (id) => post(`/repos/${id}/webhook`, {}),

  // Scoped to one repository
  overview: (repoId) => get("/overview", q(repoId)),
  pullRequests: (repoId) => get(`/repos/${repoId}/pull-requests`),
  branches: (repoId) => get(`/repos/${repoId}/branches`),
  mergePr: (repoId, number) => post(`/repos/${repoId}/pull-requests/${number}/merge`, {}),
  deleteBranch: (repoId, name) => post(`/repos/${repoId}/branches/delete`, { name }),
  activity: (repoId) => get("/activity", q(repoId)),
  aiLogs: (repoId) => get("/ai/logs", q(repoId)),
  triggerRepoFix: (repoId, branch) => post(`/repos/${repoId}/trigger-fix`, { branch }),

  // Local sandbox (fixture bugs)
  sandboxFiles: () => get("/sandbox/files"),
  triggerFix: (filePath) => post("/repos/sandbox/trigger-fix", { filePath }),
  job: (jobId) => get(`/jobs/${jobId}`),
};

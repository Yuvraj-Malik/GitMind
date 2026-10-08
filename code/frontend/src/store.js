import { create } from "zustand";
import { api, getToken, setToken } from "./lib/api";

const readTheme = () => {
  try { return localStorage.getItem("gitmind_theme") || "dark"; } catch { return "dark"; }
};

const useStore = create((set, get) => ({
  token: getToken(),
  user: null,
  theme: readTheme(),

  // Live state
  connection: "offline", // offline | connecting | live
  dataVersion: 0, // bumped on every live event so pages refetch
  activeJobs: {}, // jobId -> payload for runs in progress

  notifications: [],
  unread: 0,

  // Connected repositories + the one currently selected
  repos: [],
  reposLoaded: false,
  activeRepoId: (() => { try { return localStorage.getItem("gitmind_repo"); } catch { return null; } })(),
  loadRepos: async () => {
    try {
      const repos = await api.repos();
      const current = get().activeRepoId;
      const activeRepoId = repos.some((r) => r.id === current) ? current : repos[0]?.id || null;
      try { activeRepoId ? localStorage.setItem("gitmind_repo", activeRepoId) : localStorage.removeItem("gitmind_repo"); } catch { /* ignore */ }
      set({ repos, reposLoaded: true, activeRepoId });
    } catch {
      set({ reposLoaded: true });
    }
  },
  setActiveRepo: (id) => {
    try { localStorage.setItem("gitmind_repo", id); } catch { /* ignore */ }
    set({ activeRepoId: id });
  },

  login: (token) => {
    setToken(token);
    set({ token });
  },
  logout: () => {
    setToken(null);
    set({ token: null, user: null, notifications: [], unread: 0, activeJobs: {}, repos: [], reposLoaded: false });
  },
  loadUser: async () => {
    try {
      set({ user: await api.me() });
    } catch { /* 401 handled by interceptor */ }
  },

  toggleTheme: () => {
    const theme = get().theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("gitmind_theme", theme); } catch { /* ignore */ }
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },

  setConnection: (connection) => set({ connection }),
  bump: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  jobStarted: (p) => p?.jobId && set((s) => ({ activeJobs: { ...s.activeJobs, [p.jobId]: p } })),
  jobFinished: (p) =>
    set((s) => {
      const next = { ...s.activeJobs };
      delete next[p?.jobId];
      return { activeJobs: next };
    }),

  loadNotifications: async () => {
    try {
      const { items, unread } = await api.notifications();
      set({ notifications: items, unread });
    } catch { /* ignore */ }
  },
  pushNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications].slice(0, 30), unread: s.unread + 1 })),
  markAllRead: async () => {
    set((s) => ({ unread: 0, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    try { await api.markNotificationsRead(); } catch { /* ignore */ }
  },
}));

export default useStore;

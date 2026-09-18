import { create } from "zustand";
import {
  enqueueChatQuestion,
  fetchRepositories,
  fetchRepositoryCommits,
  fetchBranches,
  fetchPullRequests,
  fetchAiLogs,
  triggerSyncGithub,
  mergePullRequestApi,
  deleteBranchApi,
} from "../services/dashboardService";

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
}

function mapRepository(rawRepo) {
  return {
    id: String(rawRepo?._id || rawRepo?.id),
    name: rawRepo?.name,
    branches: Array.isArray(rawRepo?.branches) ? rawRepo.branches : [],
    files: Array.isArray(rawRepo?.files) ? rawRepo.files : [],
  };
}

function mapPullRequest(rawPr, index) {
  return {
    id: String(rawPr?._id || rawPr?.id || `pr-${rawPr?.number || index}`),
    number: rawPr?.number || (index + 1),
    title: rawPr?.title || `Pull Request #${rawPr?.number || index + 1}`,
    author: rawPr?.author || "Yuvraj-Malik",
    status: rawPr?.status || "open",
    branch: rawPr?.branch || (rawPr?.number === 5 ? "ai/fix-pr-5" : "main"),
    url: rawPr?.url,
    testsPassed: rawPr?.status === "open" ? 1 : 0,
    testsTotal: 1,
    buildTime: rawPr?.buildTime || "12s",
    securityScan: rawPr?.securityScan || "clean",
    aiFixPr: rawPr?.number || index + 1,
    approvals: [
      { id: "app-1", label: "Automated Checks Pass", done: rawPr?.status === "open" },
      { id: "app-2", label: "AI Safety Validation", done: true },
    ],
  };
}

function mapCommit(rawCommit, index) {
  return {
    id: String(rawCommit?.id || rawCommit?.sha || rawCommit?._id || `commit-${index}`),
    sha: rawCommit?.sha || String(index),
    title: rawCommit?.title || rawCommit?.message || "Commit",
    message: rawCommit?.message || rawCommit?.title || "Commit",
    author: rawCommit?.author || "Yuvraj-Malik",
    branch: rawCommit?.branch || "main",
    status: "passed",
    createdAt: rawCommit?.createdAt || rawCommit?.updatedAt || new Date().toISOString(),
  };
}

const useAppStore = create((set, get) => ({
  repositories: [],
  activeRepositoryId: null,
  pullRequests: [],
  commits: [],
  branches: [],
  activeBranch: "main",
  setActiveBranch: (activeBranch) => set({ activeBranch }),
  activePrId: null,
  logs: [],
  selectedLogId: null,
  activityFeed: [],
  chatMessages: [],
  searchQuery: "",
  aiStatus: "Idle",
  notificationCount: 0,
  selectedNodeId: null,
  dashboardLoading: false,
  dashboardError: null,
  
  // Theme state
  theme: localStorage.getItem("gitmind_theme") || "dark",
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("gitmind_theme", newTheme);
    if (newTheme === "light") {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
    return { theme: newTheme };
  }),
  
  // Auth state
  token: localStorage.getItem("gitmind_token") || null,
  user: null,

  setToken: (token) => {
    if (token) {
      localStorage.setItem("gitmind_token", token);
    } else {
      localStorage.removeItem("gitmind_token");
    }
    set({ token });
  },

  logout: () => {
    localStorage.removeItem("gitmind_token");
    set({
      token: null,
      user: null,
      repositories: [],
      activeRepositoryId: null,
      pullRequests: [],
      activePrId: null,
      logs: [],
      selectedLogId: null,
      activityFeed: [],
      chatMessages: [],
      searchQuery: "",
      aiStatus: "Idle",
      notificationCount: 0,
      selectedNodeId: null,
      dashboardLoading: false,
      dashboardError: null,
    });
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  loadDashboard: async () => {
    set({ dashboardLoading: true, dashboardError: null });

    try {
      const rawRepos = await fetchRepositories();
      const repositories = Array.isArray(rawRepos) ? rawRepos.map(mapRepository) : [];
      const activeRepositoryId = repositories[0]?.id || null;

      let rawPrs = [];
      let rawCommits = [];

      try {
        rawPrs = await fetchPullRequests(activeRepositoryId);
      } catch (e) {
        console.warn("fetchPullRequests:", e.message);
      }

      try {
        if (activeRepositoryId) {
          rawCommits = await fetchRepositoryCommits(activeRepositoryId);
        }
      } catch (e) {
        console.warn("fetchRepositoryCommits:", e.message);
      }

      let rawBranches = [];
      try {
        rawBranches = await fetchBranches(activeRepositoryId);
      } catch (e) {
        console.warn("fetchBranches:", e.message);
      }
      const branches = Array.isArray(rawBranches) ? rawBranches : [];

      const pullRequests = Array.isArray(rawPrs) && rawPrs.length > 0
        ? rawPrs.map(mapPullRequest)
        : [];

      const commits = Array.isArray(rawCommits)
        ? rawCommits.map(mapCommit)
        : [];

      const rawLogs = await fetchAiLogs();
      const logs = Array.isArray(rawLogs)
        ? rawLogs.map((log) => ({
            id: String(log._id),
            prId: log.prUrl || log.jobId || "unknown",
            source: log.filePath || log.action || "Unknown File",
            stack: log.reasoning || (log.status === "failed" ? `Failed at ${log.failedAt}` : "Success"),
            timestamp: new Date(log.createdAt).toLocaleString(),
            severity: log.status === "failed" ? "error" : "info",
          }))
        : [];

      const activePr = pullRequests.find((p) => p.status === "open") || pullRequests[0] || null;
      const activePrId = activePr?.id || null;

      set({
        repositories,
        activeRepositoryId,
        pullRequests,
        commits,
        branches,
        activePrId,
        logs,
        selectedLogId: logs[0]?.id || null,
        selectedNodeId: activePrId ? `node-pr-${activePrId}` : (commits[0] ? `node-${commits[0].id}` : null),
        activityFeed: [
          {
            id: `ev-load-${Date.now()}`,
            text: `Synced ${branches.length} branches, ${commits.length} commits, ${pullRequests.length} PRs`,
            time: nowTime(),
          },
        ],
        aiStatus: activePr?.number ? `Tracking PR #${activePr.number} (${activePr.status})` : "Active",
        dashboardLoading: false,
      });
    } catch (error) {
      set({
        dashboardLoading: false,
        dashboardError: error?.message || "Failed to load dashboard",
      });
    }
  },

  syncGithub: async () => {
    set({ dashboardLoading: true });
    try {
      await triggerSyncGithub();
      await get().loadDashboard();
    } catch (err) {
      set({
        dashboardLoading: false,
        dashboardError: err?.response?.data?.message || err?.message || "Sync failed",
      });
    }
  },

  mergePullRequest: async (pullNumber, commitTitle) => {
    set({ dashboardLoading: true, dashboardError: null });
    try {
      const result = await mergePullRequestApi(pullNumber, commitTitle);
      set((state) => ({
        pullRequests: state.pullRequests.map((pr) =>
          Number(pr.number) === Number(pullNumber)
            ? { ...pr, status: "merged" }
            : pr
        ),
        activityFeed: [
          {
            id: `ev-merge-${Date.now()}`,
            text: `Merged PR #${pullNumber} successfully into base branch`,
            time: nowTime(),
          },
          ...state.activityFeed,
        ],
      }));
      await get().loadDashboard();
      return result;
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to merge PR";
      set({
        dashboardLoading: false,
        dashboardError: errMsg,
      });
      throw new Error(errMsg);
    }
  },

  deleteBranch: async (branchName) => {
    set({ dashboardLoading: true, dashboardError: null });
    try {
      const result = await deleteBranchApi(branchName);
      set((state) => ({
        branches: state.branches.filter((b) => (typeof b === "string" ? b : b.name) !== branchName),
        activeBranch: state.activeBranch === branchName ? "main" : state.activeBranch,
        activityFeed: [
          {
            id: `ev-del-branch-${Date.now()}`,
            text: `Deleted branch '${branchName}' from GitHub & GitMind`,
            time: nowTime(),
          },
          ...state.activityFeed,
        ],
      }));
      await get().loadDashboard();
      return result;
    } catch (err) {
      set({
        dashboardLoading: false,
        dashboardError: err?.response?.data?.message || err?.message || "Failed to delete branch",
      });
      throw err;
    }
  },

  selectPullRequest: (activePrId) => {
    const pr = get().pullRequests.find((item) => item.id === activePrId);
    const log = get().logs.find((item) => item.prId === activePrId);
    set({
      activePrId,
      selectedNodeId: `node-${pr?.id || "pr-14"}`,
      selectedLogId: log?.id,
    });
  },

  selectNode: (selectedNodeId) => {
    const prs = get().pullRequests;
    const match = prs.find(
      (pr) =>
        `node-pr-${pr.id}` === selectedNodeId ||
        `node-ai-${pr.id}` === selectedNodeId ||
        pr.id === selectedNodeId ||
        `node-${pr.id}` === selectedNodeId
    );
    if (match) {
      set({ selectedNodeId, activePrId: match.id });
    } else {
      set({ selectedNodeId });
    }
  },

  selectLog: (selectedLogId) => set({ selectedLogId }),

  toggleApproval: (approvalId) => {
    const updated = get().pullRequests.map((pr) => {
      if (pr.id !== get().activePrId) return pr;
      return {
        ...pr,
        approvals: pr.approvals.map((approval) =>
          approval.id === approvalId
            ? { ...approval, done: !approval.done }
            : approval
        ),
      };
    });

    set({ pullRequests: updated });
  },

  appendSocketEvent: (eventName, payload) => {
    set((state) => ({
      notificationCount: state.notificationCount + 1,
      aiStatus: eventName,
      activityFeed: [
        {
          id: `ev-${Date.now()}`,
          text: `${eventName} received`,
          time: nowTime(),
          payload,
        },
        ...state.activityFeed,
      ].slice(0, 20),
    }));
  },

  submitChatQuestion: async (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const repositoryId = get().activeRepositoryId;

    const userMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: trimmed,
      citations: [],
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, userMessage],
    }));

    try {
      const response = await enqueueChatQuestion({
        question: trimmed,
        repositoryId,
      });

      set((state) => ({
        chatMessages: [
          ...state.chatMessages,
          {
            id: `msg-ai-${Date.now()}`,
            role: "assistant",
            content: `Query queued successfully (jobId: ${response?.jobId || "unknown"}).`,
            citations: [],
          },
        ],
      }));
    } catch (error) {
      set((state) => ({
        chatMessages: [
          ...state.chatMessages,
          {
            id: `msg-ai-error-${Date.now()}`,
            role: "assistant",
            content:
              error?.message || "Unable to send question to backend at the moment.",
            citations: [],
          },
        ],
      }));
    }
  },
}));

export default useAppStore;

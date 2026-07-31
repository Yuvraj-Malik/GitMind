import { create } from "zustand";
import {
  enqueueChatQuestion,
  fetchRepositories,
  fetchRepositoryCommits,
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

function mapCommitToPullRequest(rawCommit, index) {
  return {
    id: String(rawCommit?.id || rawCommit?.sha || rawCommit?._id),
    number: rawCommit?.number,
    title: rawCommit?.title || rawCommit?.message,
    author: rawCommit?.author,
    status: rawCommit?.status,
    branch: rawCommit?.branch,
    testsPassed: rawCommit?.testsPassed,
    testsTotal: rawCommit?.testsTotal,
    buildTime: rawCommit?.buildTime,
    securityScan: rawCommit?.securityScan,
    aiFixPr: rawCommit?.aiFixPr,
    approvals: rawCommit?.approvals || [],
  };
}

const useAppStore = create((set, get) => ({
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

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  loadDashboard: async () => {
    set({ dashboardLoading: true, dashboardError: null });

    try {
      const rawRepos = await fetchRepositories();
      const repositories = Array.isArray(rawRepos) ? rawRepos.map(mapRepository) : [];
      const activeRepositoryId = repositories[0]?.id || null;

      let pullRequests = [];
      if (activeRepositoryId) {
        const rawCommits = await fetchRepositoryCommits(activeRepositoryId);
        pullRequests = Array.isArray(rawCommits)
          ? rawCommits.map(mapCommitToPullRequest)
          : [];
      }

      const activePrId = pullRequests[0]?.id || null;

      set({
        repositories,
        activeRepositoryId,
        pullRequests,
        activePrId,
        selectedNodeId: activePrId ? `node-${activePrId}` : null,
        activityFeed: [
          {
            id: `ev-load-${Date.now()}`,
            text: "Dashboard synced from backend",
            time: nowTime(),
          },
        ],
        aiStatus: activePrId ? `Tracking PR #${pullRequests[0].number}` : "Idle",
        dashboardLoading: false,
      });
    } catch (error) {
      set({
        dashboardLoading: false,
        dashboardError: error?.message || "Failed to load dashboard",
      });
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

  selectNode: (selectedNodeId) => set({ selectedNodeId }),

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

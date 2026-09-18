import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { 
  GitBranch, 
  GitCommit,
  Terminal, 
  Activity, 
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2
} from "lucide-react";
import GraphCanvas from "../canvas/GraphCanvas";
import ChatDrawer from "../chat-rag/ChatDrawer";
import LiveMetrics from "../pr-metrics/LiveMetrics";
import Topbar from "../topbar/Topbar";
import ErrorLogViewer from "../pr-metrics/ErrorLogViewer";
import useWebSocket from "../../hooks/useWebSocket";
import useAppStore from "../../store/appStore";

function DashboardPage() {
  const token = useAppStore((state) => state.token);
  const activityFeed = useAppStore((state) => state.activityFeed);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const loadDashboard = useAppStore((state) => state.loadDashboard);
  const syncGithub = useAppStore((state) => state.syncGithub);
  const deleteBranch = useAppStore((state) => state.deleteBranch);
  const appendSocketEvent = useAppStore((state) => state.appendSocketEvent);
  const dashboardLoading = useAppStore((state) => state.dashboardLoading);
  const dashboardError = useAppStore((state) => state.dashboardError);
  const repositories = useAppStore((state) => state.repositories);
  const activeRepositoryId = useAppStore((state) => state.activeRepositoryId);
  const pullRequests = useAppStore((state) => state.pullRequests);
  const commits = useAppStore((state) => state.commits);
  const branches = useAppStore((state) => state.branches);
  const activeBranch = useAppStore((state) => state.activeBranch);
  const setActiveBranch = useAppStore((state) => state.setActiveBranch);
  const logs = useAppStore((state) => state.logs);

  const [bottomTab, setBottomTab] = useState("commits"); // "commits" | "branches" | "logs" | "activity"

  const activeRepository = repositories.find((repo) => repo.id === activeRepositoryId) || repositories[0];
  const repoBranches = activeRepository?.branches || [];
  const displayBranches = branches.length > 0 ? branches : repoBranches;

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [loadDashboard, token]);

  const websocketHandlers = useMemo(
    () => ({
      AI_FIX_STARTED: (payload) => appendSocketEvent("AI_FIX_STARTED", payload),
      NEW_NODE_ADDED: (payload) => appendSocketEvent("NEW_NODE_ADDED", payload),
      NEW_PR_CREATED: (payload) => appendSocketEvent("NEW_PR_CREATED", payload),
    }),
    [appendSocketEvent]
  );

  useWebSocket(null, websocketHandlers);

  const visibleActivity = useMemo(() => {
    if (!searchQuery.trim()) return activityFeed;
    const query = searchQuery.toLowerCase();
    return activityFeed.filter((event) => event.text.toLowerCase().includes(query));
  }, [activityFeed, searchQuery]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="workspace-shell">
      <Topbar />
      
      <div className="dashboard-grid-layout">
        {/* Main Left/Center Column */}
        <div className="dashboard-canvas-column">
          {/* Subheader Toolbar */}
          <div className="canvas-header-bar">
            <div className="header-bar-left">
              <span className="repo-chip">
                <GitBranch size={15} />
                <b>{activeRepository?.name || "git-mind-test"}</b>
                <span className="branch-tag">{activeBranch || "main"}</span>
              </span>
              <span className="header-stat-pill" title="Total active branches in repository">
                <GitBranch size={13} /> {displayBranches.length} Branches
              </span>
              <span className="header-stat-pill" title="Total pull requests in repository">
                <GitPullRequest size={13} /> {pullRequests.length} PRs
              </span>
              <span className="header-stat-pill" title="Commits on default branch">
                <GitCommit size={13} /> {commits.length} Commits
              </span>
            </div>
            
            <div className="header-bar-right">
              <button 
                type="button" 
                className="sync-indicator" 
                onClick={syncGithub}
                style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", cursor: "pointer" }}
                title="Click to sync latest branches and commits from GitHub"
              >
                <span className="sync-pulse" /> {dashboardLoading ? "Syncing..." : "Live GitHub Synced"}
              </button>
            </div>
          </div>

          {/* Clean Dedicated Canvas Stage */}
          <div className="canvas-viewport-container">
            {dashboardLoading && <div className="overlay-note">Syncing data from GitHub...</div>}
            {dashboardError && <div className="overlay-note error">{dashboardError}</div>}
            <GraphCanvas />
          </div>

          {/* Docked Non-Overlapping Bottom Panel */}
          <div className="bottom-dock-panel">
            <div className="dock-tab-bar">
              <button 
                type="button" 
                className={`dock-tab-btn ${bottomTab === "commits" ? "active" : ""}`}
                onClick={() => setBottomTab("commits")}
              >
                <GitCommit size={14} /> Commits ({commits.length})
              </button>
              <button 
                type="button" 
                className={`dock-tab-btn ${bottomTab === "branches" ? "active" : ""}`}
                onClick={() => setBottomTab("branches")}
              >
                <GitBranch size={14} /> Branches ({displayBranches.length})
              </button>
              <button 
                type="button" 
                className={`dock-tab-btn ${bottomTab === "logs" ? "active" : ""}`}
                onClick={() => setBottomTab("logs")}
              >
                <Terminal size={14} /> Diagnostic Logs ({logs.length})
              </button>
              <button 
                type="button" 
                className={`dock-tab-btn ${bottomTab === "activity" ? "active" : ""}`}
                onClick={() => setBottomTab("activity")}
              >
                <Activity size={14} /> Live Events ({visibleActivity.length})
              </button>
            </div>

            <div className="dock-content-area">
              {bottomTab === "commits" && (
                <div className="dock-commits-full-list">
                  {commits.map((c) => (
                    <div key={c.id} className="dock-commit-row">
                      <span className="dock-commit-sha">{c.sha?.slice(0, 7)}</span>
                      <span className="dock-commit-msg">{c.message}</span>
                      <span className="dock-commit-branch">{c.branch}</span>
                      <span className="dock-commit-author">{c.author}</span>
                      <span className="dock-commit-date">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {bottomTab === "branches" && (
                <div className="dock-branches-grid">
                  {displayBranches.map((b) => (
                    <div 
                      key={b.name} 
                      className={`dock-branch-card ${activeBranch === b.name ? "active-branch" : ""}`}
                      onClick={() => setActiveBranch(b.name)}
                      style={{ cursor: "pointer" }}
                      title={`Select branch ${b.name}`}
                    >
                      <div className="dock-branch-info">
                        <GitBranch size={14} style={{ color: activeBranch === b.name ? "#38bdf8" : "#94a3b8" }} />
                        <span className="dock-branch-name">{b.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="dock-branch-badge">{b.commitCount || 1} commits</span>
                        {b.name !== "main" && b.name !== "master" && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete branch "${b.name}" from GitHub and GitMind?`)) {
                                try {
                                  await deleteBranch(b.name);
                                } catch (err) {
                                  alert(`Failed: ${err?.message}`);
                                }
                              }
                            }}
                            title={`Delete branch ${b.name}`}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#f87171",
                              cursor: "pointer",
                              padding: "2px 4px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {bottomTab === "logs" && <ErrorLogViewer />}

              {bottomTab === "activity" && (
                <div className="dock-activity-view">
                  <div className="activity-col" style={{ gridColumn: "span 2" }}>
                    <h5>Live Events & Webhook Logs</h5>
                    <ul className="activity-list">
                      {visibleActivity.map((event) => (
                        <li key={event.id}>
                          <span className="event-bullet" />
                          <span className="event-text">{event.text}</span>
                          <span className="event-timestamp">{event.time}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Column */}
        <aside className="dashboard-sidebar-column">
          <div className="sidebar-widget metrics-widget">
            <LiveMetrics />
          </div>
          <div className="sidebar-widget chat-widget">
            <ChatDrawer />
          </div>
        </aside>
      </div>
    </main>
  );
}

export default DashboardPage;


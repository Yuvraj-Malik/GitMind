import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { 
  GitBranch, 
  Terminal, 
  Activity, 
  GitPullRequest,
  CheckCircle2,
  AlertCircle
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
  const appendSocketEvent = useAppStore((state) => state.appendSocketEvent);
  const dashboardLoading = useAppStore((state) => state.dashboardLoading);
  const dashboardError = useAppStore((state) => state.dashboardError);
  const repositories = useAppStore((state) => state.repositories);
  const activeRepositoryId = useAppStore((state) => state.activeRepositoryId);
  const pullRequests = useAppStore((state) => state.pullRequests);
  const commits = useAppStore((state) => state.commits);
  const logs = useAppStore((state) => state.logs);

  const [bottomTab, setBottomTab] = useState("logs"); // "logs" | "activity"

  const activeRepository = repositories.find((repo) => repo.id === activeRepositoryId) || repositories[0];

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
                <span className="branch-tag">main</span>
              </span>
              <span className="header-stat-pill">
                <GitPullRequest size={13} /> {pullRequests.length} PRs
              </span>
              <span className="header-stat-pill">
                {commits.length} Commits
              </span>
            </div>
            
            <div className="header-bar-right">
              <span className="sync-indicator">
                <span className="sync-pulse" /> Live Synced
              </span>
            </div>
          </div>

          {/* Clean Dedicated Canvas Stage */}
          <div className="canvas-viewport-container">
            {dashboardLoading && <div className="overlay-note">Loading backend data...</div>}
            {dashboardError && <div className="overlay-note error">{dashboardError}</div>}
            <GraphCanvas />
          </div>

          {/* Docked Non-Overlapping Bottom Panel */}
          <div className="bottom-dock-panel">
            <div className="dock-tab-bar">
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
                <Activity size={14} /> Recent Activity & Commits ({commits.length})
              </button>
            </div>

            <div className="dock-content-area">
              {bottomTab === "logs" ? (
                <ErrorLogViewer />
              ) : (
                <div className="dock-activity-view">
                  <div className="activity-col">
                    <h5>Live Events</h5>
                    <ul className="activity-list">
                      {visibleActivity.slice(0, 5).map((event) => (
                        <li key={event.id}>
                          <span className="event-bullet" />
                          <span className="event-text">{event.text}</span>
                          <span className="event-timestamp">{event.time}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="commits-col">
                    <h5>Recent Commits</h5>
                    <div className="commits-timeline-list">
                      {commits.map((c) => (
                        <div key={c.id} className="commit-timeline-item">
                          <span className="commit-sha">{c.sha?.slice(0, 7)}</span>
                          <span className="commit-msg truncate">{c.message}</span>
                          <span className="commit-branch">{c.branch}</span>
                        </div>
                      ))}
                    </div>
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

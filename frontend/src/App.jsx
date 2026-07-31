import { useEffect, useMemo } from "react";
import GraphCanvas from "./features/canvas/GraphCanvas";
import ChatDrawer from "./features/chat-rag/ChatDrawer";
import LiveMetrics from "./features/pr-metrics/LiveMetrics";
import Sidebar from "./features/sidebar/Sidebar";
import Topbar from "./features/topbar/Topbar";
import ErrorLogViewer from "./features/pr-metrics/ErrorLogViewer";
import useWebSocket from "./hooks/useWebSocket";
import useAppStore from "./store/appStore";

function App() {
  const activityFeed = useAppStore((state) => state.activityFeed);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const loadDashboard = useAppStore((state) => state.loadDashboard);
  const appendSocketEvent = useAppStore((state) => state.appendSocketEvent);
  const dashboardLoading = useAppStore((state) => state.dashboardLoading);
  const dashboardError = useAppStore((state) => state.dashboardError);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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

  return (
    <div className="app-page">
      <Sidebar />
      <main className="workspace-shell">
        <Topbar />
        <section className="canvas-stage">
          {dashboardLoading ? <div className="overlay-note">Loading backend data...</div> : null}
          {dashboardError ? <div className="overlay-note error">{dashboardError}</div> : null}
          <GraphCanvas />

          <div className="floating-panel panel-metrics-card">
            <LiveMetrics />
          </div>

          <div className="floating-panel panel-pr-card">
            <ChatDrawer />
          </div>

          <div className="floating-panel panel-log-card">
            <ErrorLogViewer />
          </div>

          <div className="floating-panel panel-activity-card">
            <h4>Recent Activity</h4>
            <ul>
              {visibleActivity.slice(0, 5).map((event) => (
                <li key={event.id}>
                  {event.text} <span className="event-time">{event.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="timeline-strip">
            <span>Recent Commits Timeline</span>
            <div className="timeline-points">
              {activityFeed.slice(0, 3).map((event) => (
                <span key={`timeline-${event.id}`}>{event.text}</span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

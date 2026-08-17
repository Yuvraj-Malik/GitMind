import {
  Bell,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import useAppStore from "../../store/appStore";
import { getStatusTone } from "../../utils/statusAppearance";

function Topbar() {
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const aiStatus = useAppStore((state) => state.aiStatus);
  const notificationCount = useAppStore((state) => state.notificationCount);
  const loadDashboard = useAppStore((state) => state.loadDashboard);

  return (
    <header className="topbar">
      <div className="brand">
        <Sparkles size={18} />
        <span>Git-Mind</span>
      </div>

      <div className="search-wrap">
        <Search size={16} />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search repos, PRs, logs..."
        />
      </div>

      <div className="top-actions">
        <button className="icon-btn" type="button" aria-label="filters">
          <SlidersHorizontal size={16} />
        </button>
        <button className="icon-btn" type="button" aria-label="notifications">
          <Bell size={16} />
          {notificationCount > 0 ? (
            <span className="notif-dot">{notificationCount}</span>
          ) : null}
        </button>
        <button
          className="icon-btn"
          type="button"
          aria-label="reload data"
          onClick={loadDashboard}
          title="Reload backend data"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className={`status-pill ${getStatusTone(aiStatus)}`}>
        <ShieldCheck size={14} className="status-pill-icon" />
        <span className="status-pill-label">Git-Mind AI: {aiStatus}</span>
      </div>
    </header>
  );
}

export default Topbar;

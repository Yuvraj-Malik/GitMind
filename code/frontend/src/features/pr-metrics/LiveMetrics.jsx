import useAppStore from "../../store/appStore";
import { GitPullRequest, Activity, ShieldCheck, Clock, User, GitBranch } from "lucide-react";

function LiveMetrics() {
  const pullRequests = useAppStore((state) => state.pullRequests);
  const activePrId = useAppStore((state) => state.activePrId);

  const pr = pullRequests.find((item) => item.id === activePrId) || pullRequests[0] || null;

  return (
    <div className="metrics-card-container">
      <div className="metrics-card-header">
        <h4>Live Build Metrics</h4>
        {pr && (
          <span className={`status-badge-inline ${pr.status === "failed" ? "failed" : "open"}`}>
            {pr.status ? pr.status.toUpperCase() : "OPEN"}
          </span>
        )}
      </div>

      <div className="metrics-grid-compact">
        <div className="metric-box">
          <div className="metric-icon"><GitPullRequest size={14} /></div>
          <div className="metric-data">
            <span className="metric-label">Active PR</span>
            <strong className="metric-val">{pr?.number ? `#${pr.number}` : "None"}</strong>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon"><GitBranch size={14} /></div>
          <div className="metric-data">
            <span className="metric-label">Branch</span>
            <strong className="metric-val" title={pr?.branch || "main"}>
              {pr?.branch || "main"}
            </strong>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon"><User size={14} /></div>
          <div className="metric-data">
            <span className="metric-label">Author</span>
            <strong className="metric-val">{pr?.author || "git-mind"}</strong>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon"><Activity size={14} /></div>
          <div className="metric-data">
            <span className="metric-label">Checks</span>
            <strong className={`metric-val ${pr?.status === "failed" ? "text-rose" : "text-green"}`}>
              {pr?.status === "failed" ? "1 Failed" : "1 Passing"}
            </strong>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon"><Clock size={14} /></div>
          <div className="metric-data">
            <span className="metric-label">Build Time</span>
            <strong className="metric-val">{pr?.buildTime || "10s"}</strong>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon"><ShieldCheck size={14} /></div>
          <div className="metric-data">
            <span className="metric-label">Security</span>
            <strong className="metric-val text-green">{pr?.securityScan || "Clean"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveMetrics;

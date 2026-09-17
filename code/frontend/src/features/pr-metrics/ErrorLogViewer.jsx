import useAppStore from "../../store/appStore";
import { AlertCircle, FileCode2 } from "lucide-react";

function ErrorLogViewer() {
  const logs = useAppStore((state) => state.logs);
  const selectedLogId = useAppStore((state) => state.selectedLogId);
  const selectLog = useAppStore((state) => state.selectLog);

  const selectedLog = logs.find((log) => log.id === selectedLogId) || logs[0];

  if (!logs || logs.length === 0) {
    return (
      <div className="dock-empty-state">
        <AlertCircle size={18} />
        <span>No diagnostic logs recorded. All systems running normally.</span>
      </div>
    );
  }

  return (
    <div className="dock-logs-split">
      {/* Log list sidebar */}
      <div className="dock-logs-list">
        {logs.map((log) => (
          <button
            type="button"
            key={log.id}
            className={`dock-log-item ${log.id === selectedLog?.id ? "selected" : ""}`}
            onClick={() => selectLog(log.id)}
          >
            <div className="log-item-top">
              <span className={`log-badge ${log.severity === "error" ? "error" : "info"}`}>
                {log.severity?.toUpperCase()}
              </span>
              <span className="log-time">{log.timestamp}</span>
            </div>
            <div className="log-item-source">
              <FileCode2 size={13} />
              <span className="truncate">{log.source}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Log detail console */}
      <div className="dock-log-terminal">
        <div className="terminal-bar">
          <span className="terminal-title">
            <FileCode2 size={14} /> {selectedLog?.source || "Diagnostic Trace"}
          </span>
          <span className={`terminal-badge ${selectedLog?.severity === "error" ? "error" : "info"}`}>
            {selectedLog?.severity === "error" ? "FAILED CHECK" : "RECORDED"}
          </span>
        </div>
        <pre className="terminal-body">
          {selectedLog?.stack || "No error details available for this run."}
        </pre>
      </div>
    </div>
  );
}

export default ErrorLogViewer;

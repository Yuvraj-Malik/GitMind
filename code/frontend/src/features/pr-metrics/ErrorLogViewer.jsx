import useAppStore from "../../store/appStore";

function ErrorLogViewer() {
  const logs = useAppStore((state) => state.logs);
  const selectedLogId = useAppStore((state) => state.selectedLogId);
  const selectLog = useAppStore((state) => state.selectLog);

  const selectedLog = logs.find((log) => log.id === selectedLogId) || logs[0];

  if (!selectedLog) {
    return <div className="empty-panel">No error logs yet. Waiting for backend events.</div>;
  }

  return (
    <div>
      <div className="error-header">
        <strong>Error Log</strong>
        <span>{selectedLog?.source}</span>
      </div>

      <pre className="error-log">{selectedLog?.stack || "No stack trace available."}</pre>

      <div className="error-list">
        {logs.slice(0, 3).map((log) => (
          <button
            type="button"
            key={log.id}
            className={`error-list-item${log.id === selectedLog?.id ? " active" : ""}`}
            onClick={() => selectLog(log.id)}
          >
            <span>{log.timestamp}</span>
            <span>{log.severity.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ErrorLogViewer;

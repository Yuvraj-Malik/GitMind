import useAppStore from "../../store/appStore";

function LiveMetrics() {
  const pullRequests = useAppStore((state) => state.pullRequests);
  const activePrId = useAppStore((state) => state.activePrId);

  const pr = pullRequests.find((item) => item.id === activePrId) || pullRequests[0] || null;

  if (!pr) {
    return <div className="empty-panel">No PR metrics yet. Connect backend data to populate.</div>;
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <h3 style={{ margin: 0, fontSize: "0.88rem" }}>Live Build Metrics</h3>
      <div className="metrics-grid">
        <MetricCard label="PR" value={`#${pr.number}`} />
        <MetricCard label="Build Time" value={pr.buildTime} />
        <MetricCard label="Author" value={pr.author} />
        <MetricCard
          label="Tests"
          value={`${pr.testsPassed}/${pr.testsTotal}`}
        />
        <MetricCard label="Security" value={pr.securityScan} />
        <MetricCard label="Fix PR" value={`#${pr.aiFixPr}`} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default LiveMetrics;

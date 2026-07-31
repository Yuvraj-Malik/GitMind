import ErrorLogViewer from "./ErrorLogViewer";

function LiveMetrics() {
  return (
    <div style={{ display: "grid", gap: "0.6rem", height: "100%" }}>
      <h3 style={{ margin: 0 }}>Live PR Metrics</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
        <MetricCard label="Open PRs" value="12" />
        <MetricCard label="Failed Checks" value="3" />
        <MetricCard label="AI Retries" value="7" />
      </div>
      <ErrorLogViewer />
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={{ border: "1px solid #d2dde0", borderRadius: "10px", padding: "0.6rem" }}>
      <div style={{ fontSize: "0.78rem", color: "#4f6d75" }}>{label}</div>
      <strong style={{ fontSize: "1.2rem" }}>{value}</strong>
    </div>
  );
}

export default LiveMetrics;

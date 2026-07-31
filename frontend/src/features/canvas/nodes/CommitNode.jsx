function CommitNode({ data }) {
  return (
    <div
      style={{
        border: "1px solid #5f8b95",
        borderRadius: "12px",
        background: "#eff8fa",
        padding: "0.6rem 0.75rem",
        minWidth: 160,
      }}
    >
      <strong>Commit</strong>
      <div>{data?.label || "unknown"}</div>
    </div>
  );
}

export default CommitNode;

function AINode({ data }) {
  return (
    <div
      style={{
        border: "1px solid #c17d27",
        borderRadius: "12px",
        background: "#fff8ee",
        padding: "0.6rem 0.75rem",
        minWidth: 180,
      }}
    >
      <strong>AI Patch</strong>
      <div>{data?.label || "pending"}</div>
    </div>
  );
}

export default AINode;

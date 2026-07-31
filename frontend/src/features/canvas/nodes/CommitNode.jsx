import { Handle, Position } from "reactflow";

function CommitNode({ data }) {
  const isSelected = Boolean(data?.selected);
  return (
    <div className={`node-card danger${isSelected ? " selected" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#ef5c6a", border: "1px solid #f8a3ab" }}
      />
      <strong>{data?.label || "PR"}</strong>
      <small>{data?.subtitle || "Failed check run"}</small>
      <span className="node-chip">CI FAILED</span>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#ef5c6a", border: "1px solid #f8a3ab" }}
      />
    </div>
  );
}

export default CommitNode;

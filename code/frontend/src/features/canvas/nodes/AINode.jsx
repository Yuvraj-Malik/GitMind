import { Handle, Position } from "reactflow";

function AINode({ data }) {
  const isSelected = Boolean(data?.selected);
  return (
    <div className={`node-card ai${isSelected ? " selected" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#5fe3ad", border: "1px solid #9bf4d2" }}
      />
      <strong>{data?.label || "AI Patch"}</strong>
      <small>{data?.subtitle || "Generating fix"}</small>
      <span className="node-chip success">AI READY</span>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#5fe3ad", border: "1px solid #9bf4d2" }}
      />
    </div>
  );
}

export default AINode;

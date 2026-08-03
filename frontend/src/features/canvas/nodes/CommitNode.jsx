import { Handle, Position } from "reactflow";
import { formatStatus, getStatusTone } from "../../../utils/statusAppearance";

function CommitNode({ data }) {
  const isSelected = Boolean(data?.selected);
  const tone = getStatusTone(data?.status);
  return (
    <div className={`node-card ${tone}${isSelected ? " selected" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        className={`node-handle ${tone}`}
      />
      <strong>{data?.label || "PR"}</strong>
      <small>{data?.subtitle || "Failed check run"}</small>
      <span className={`node-chip ${tone}`}>{formatStatus(data?.status)}</span>
      <Handle
        type="source"
        position={Position.Right}
        className={`node-handle ${tone}`}
      />
    </div>
  );
}

export default CommitNode;

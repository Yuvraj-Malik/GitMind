import { BaseEdge, getBezierPath } from "reactflow";

function CustomEdge({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  style,
}) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        strokeWidth: 2.5,
        stroke: "#66ebbc",
        filter: "drop-shadow(0 0 4px rgba(102, 235, 188, 0.8))",
        ...style,
      }}
    />
  );
}

export default CustomEdge;

import { useMemo } from "react";
import { useNodesState, useEdgesState } from "reactflow";

const initialNodes = [
  { id: "n1", type: "commit", position: { x: 20, y: 80 }, data: { label: "PR #141 failed" } },
  { id: "n2", type: "ai", position: { x: 300, y: 80 }, data: { label: "AI_FIX_STARTED" } },
];

const initialEdges = [
  { id: "e1-2", source: "n1", target: "n2", type: "custom" },
];

function useCanvasState() {
  const [nodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, onEdgesChange] = useEdgesState(initialEdges);

  return useMemo(
    () => ({ nodes, edges, onNodesChange, onEdgesChange }),
    [nodes, edges, onNodesChange, onEdgesChange]
  );
}

export default useCanvasState;

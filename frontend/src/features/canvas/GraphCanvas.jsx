import { ReactFlow, Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import CommitNode from "./nodes/CommitNode";
import AINode from "./nodes/AINode";
import CustomEdge from "./edges/CustomEdge";
import useCanvasState from "./useCanvasState";

const nodeTypes = { commit: CommitNode, ai: AINode };
const edgeTypes = { custom: CustomEdge };

function GraphCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange } = useCanvasState();

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 360 }}>
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default GraphCanvas;

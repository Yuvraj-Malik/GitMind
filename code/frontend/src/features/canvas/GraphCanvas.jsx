import { ReactFlow, Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import CommitNode from "./nodes/CommitNode";
import AINode from "./nodes/AINode";
import CustomEdge from "./edges/CustomEdge";
import useCanvasState from "./useCanvasState";
import useAppStore from "../../store/appStore";

const nodeTypes = { commit: CommitNode, ai: AINode };
const edgeTypes = { custom: CustomEdge };

function GraphCanvas() {
  const { nodes, edges } = useCanvasState();
  const selectNode = useAppStore((state) => state.selectNode);

  return (
    <div className="flow-canvas" style={{ width: "100%", height: "100%", position: "relative" }}>
      {nodes.length === 0 ? (
        <div className="overlay-note">No graph data yet. Backend pull requests will render here.</div>
      ) : null}

      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => selectNode(node.id)}
        fitViewOptions={{ padding: 0.3 }}
      >
        <Background color="rgba(117, 138, 176, 0.2)" gap={24} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default GraphCanvas;

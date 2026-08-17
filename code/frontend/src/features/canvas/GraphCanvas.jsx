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
  const repositories = useAppStore((state) => state.repositories);
  const activeRepositoryId = useAppStore((state) => state.activeRepositoryId);
  const selectNode = useAppStore((state) => state.selectNode);

  const activeRepository = repositories.find((repo) => repo.id === activeRepositoryId);

  return (
    <div className="flow-canvas">
      <section className="repo-tree">
        <h4>Repository tree</h4>
        <ul>
          <li>{activeRepository?.name || "No repository loaded"}</li>
          {(activeRepository?.files || []).map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      </section>

      {nodes.length === 0 ? (
        <div className="overlay-note">No graph data yet. Backend commits will render here.</div>
      ) : null}

      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => selectNode(node.id)}
        fitViewOptions={{ padding: 0.25 }}
      >
        <Background color="rgba(117, 138, 176, 0.2)" gap={24} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default GraphCanvas;

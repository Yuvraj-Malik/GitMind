import { useMemo } from "react";
import useAppStore from "../../store/appStore";

function sanitizeNode(node, index) {
  const safeX = Number.isFinite(node?.position?.x) ? node.position.x : 180 + index * 220;
  const safeY = Number.isFinite(node?.position?.y) ? node.position.y : 260;
  return {
    ...node,
    id: node?.id || `node-${index}`,
    position: { x: safeX, y: safeY },
    data: node?.data || {},
  };
}

function useCanvasState() {
  const pullRequests = useAppStore((state) => state.pullRequests);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);

  return useMemo(
    () => ({
      nodes: pullRequests
        .flatMap((pr, index) => {
          const baseX = 240 + index * 440;
          const baseY = 240;
          return [
            {
              id: `node-${pr.id}`,
              type: "commit",
              position: { x: baseX, y: baseY },
              data: {
                label: `PR #${pr.number}`,
                subtitle: pr.title,
                status: pr.status,
                selected: selectedNodeId === `node-${pr.id}`,
              },
            },
            {
              id: `node-ai-${pr.id}`,
              type: "ai",
              position: { x: baseX + 280, y: baseY },
              data: {
                label: `AI Fix PR #${pr.aiFixPr}`,
                subtitle:
                  pr.status === "failed"
                    ? "Proposed patch generated"
                    : "Patch validated",
                selected: selectedNodeId === `node-ai-${pr.id}`,
              },
            },
          ];
        })
        .map(sanitizeNode),
      edges: pullRequests.map((pr) => ({
        id: `edge-${pr.id}`,
        source: `node-${pr.id}`,
        target: `node-ai-${pr.id}`,
        type: "custom",
        animated: true,
      })),
    }),
    [pullRequests, selectedNodeId]
  );
}

export default useCanvasState;

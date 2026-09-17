import { useMemo } from "react";
import useAppStore from "../../store/appStore";

function useCanvasState() {
  const pullRequests = useAppStore((state) => state.pullRequests);
  const commits = useAppStore((state) => state.commits);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);

  return useMemo(() => {
    const nodes = [];
    const edges = [];

    // Lay out Pull Requests horizontally with generous spacing
    pullRequests.forEach((pr, index) => {
      const prNodeId = `node-pr-${pr.id}`;
      const baseX = 80 + index * 420;
      const baseY = 80;

      nodes.push({
        id: prNodeId,
        type: "commit",
        position: { x: baseX, y: baseY },
        data: {
          label: `PR #${pr.number}`,
          subtitle: pr.title || "Pull Request",
          status: pr.status || "open",
          branch: pr.branch || "main",
          author: pr.author || "git-mind",
          selected: selectedNodeId === prNodeId,
        },
      });

      // If PR has an AI Fix or is failed, connect an AI fix node
      if (pr.status === "failed" || pr.aiFixPr) {
        const aiNodeId = `node-ai-${pr.id}`;
        nodes.push({
          id: aiNodeId,
          type: "ai",
          position: { x: baseX + 230, y: baseY },
          data: {
            label: `AI Fix for PR #${pr.number}`,
            subtitle:
              pr.status === "failed"
                ? "Proposed patch generated"
                : "Patch validated & ready",
            status: pr.status === "failed" ? "failed" : "passed",
            selected: selectedNodeId === aiNodeId,
          },
        });

        edges.push({
          id: `edge-${pr.id}`,
          source: prNodeId,
          target: aiNodeId,
          type: "custom",
          animated: true,
        });
      }
    });

    return { nodes, edges };
  }, [pullRequests, commits, selectedNodeId]);
}

export default useCanvasState;

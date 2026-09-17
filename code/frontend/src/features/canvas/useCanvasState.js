import { useMemo } from "react";
import useAppStore from "../../store/appStore";

function useCanvasState() {
  const pullRequests = useAppStore((state) => state.pullRequests);
  const commits = useAppStore((state) => state.commits);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);

  return useMemo(() => {
    const nodes = [];
    const edges = [];

    // Separate open PRs (active focus) and closed/merged PRs
    const openPrs = pullRequests.filter((pr) => pr.status === "open");
    const otherPrs = pullRequests.filter((pr) => pr.status !== "open");

    // Layout open PRs along top row
    openPrs.forEach((pr, index) => {
      const prNodeId = `node-pr-${pr.id}`;
      const baseX = 60 + index * 460;
      const baseY = 60;

      nodes.push({
        id: prNodeId,
        type: "commit",
        position: { x: baseX, y: baseY },
        data: {
          label: `PR #${pr.number} (Open)`,
          subtitle: pr.title || "Pull Request",
          status: pr.status || "open",
          branch: pr.branch || "main",
          author: pr.author || "Yuvraj-Malik",
          selected: selectedNodeId === prNodeId,
        },
      });

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

    // Layout closed/merged PRs in a clean grid below
    const cols = 4;
    const startY = openPrs.length > 0 ? 220 : 60;
    otherPrs.forEach((pr, index) => {
      const prNodeId = `node-pr-${pr.id}`;
      const col = index % cols;
      const row = Math.floor(index / cols);
      const baseX = 60 + col * 260;
      const baseY = startY + row * 140;

      nodes.push({
        id: prNodeId,
        type: "commit",
        position: { x: baseX, y: baseY },
        data: {
          label: `PR #${pr.number}`,
          subtitle: pr.title || "Pull Request",
          status: pr.status || "closed",
          branch: pr.branch || "main",
          author: pr.author || "Yuvraj-Malik",
          selected: selectedNodeId === prNodeId,
        },
      });
    });

    return { nodes, edges };
  }, [pullRequests, commits, selectedNodeId]);
}

export default useCanvasState;

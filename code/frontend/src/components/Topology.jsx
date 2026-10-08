import { useMemo } from "react";
import ReactFlow, { Background, Controls, Handle, Position } from "reactflow";
import "reactflow/dist/style.css";
import { Bot, GitCommit, GitPullRequest } from "lucide-react";
import { isAiBranch, timeAgo } from "../lib/format";

function CommitNode({ data }) {
  return (
    <div className="card px-3 py-2" style={{ width: 170, borderColor: data.head ? "var(--accent)" : "var(--border)" }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className="flex items-center gap-1.5 text-[11px]">
        <GitCommit size={12} className="muted" />
        <span className="mono muted">{data.sha}</span>
        {data.head && <span className="badge badge-accent ml-auto h-[18px] px-1.5 text-[10px]">HEAD</span>}
      </div>
      <div className="mt-1 truncate text-[12px] font-medium" title={data.title}>{data.title}</div>
      <div className="faint mt-0.5 truncate text-[11px]">{data.author || "unknown"} · {timeAgo(data.date)}</div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="b" type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function PrNode({ data }) {
  const ai = isAiBranch(data.branch);
  const color = data.status === "merged" ? "var(--accent)" : data.status === "open" ? (ai ? "var(--ok)" : "var(--info)") : "var(--faint)";
  return (
    <a href={data.url} target="_blank" rel="noreferrer" className="card block px-3 py-2" style={{ width: 190, borderColor: color }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color }}>
        {ai ? <Bot size={12} /> : <GitPullRequest size={12} />}
        <span className="font-semibold">#{data.number}</span>
        <span className="ml-auto capitalize">{data.status}</span>
      </div>
      <div className="mt-1 truncate text-[12px] font-medium" title={data.title}>{data.title || "(no title)"}</div>
      <div className="faint mono mt-0.5 truncate text-[11px]">{data.branch}</div>
    </a>
  );
}

const nodeTypes = { commit: CommitNode, pr: PrNode };

/** Default-branch history (last 6 commits) with the most recent pull requests hanging off HEAD. */
export default function Topology({ commits = [], pullRequests = [] }) {
  const { nodes, edges } = useMemo(() => {
    const recent = [...commits]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-5);
    const nodes = recent.map((c, i) => ({
      id: `c-${c.fullSha || c.sha}`,
      type: "commit",
      position: { x: i * 195, y: 0 },
      data: { sha: c.sha, title: c.title || c.message, author: c.author, date: c.createdAt, head: i === recent.length - 1 },
      draggable: false,
    }));
    const edges = recent.slice(1).map((c, i) => ({
      id: `e-${i}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      style: { stroke: "var(--faint)" },
    }));
    const head = nodes[nodes.length - 1];
    const prs = [...pullRequests].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
    const startX = Math.max(0, (head?.position.x || 0) - ((prs.length - 1) * 210) / 2);
    prs.forEach((pr, i) => {
      const id = `pr-${pr.number}`;
      nodes.push({ id, type: "pr", position: { x: startX + i * 210, y: 150 }, data: pr, draggable: false });
      if (head) {
        edges.push({
          id: `e-${id}`,
          source: head.id,
          sourceHandle: "b",
          target: id,
          animated: pr.status === "open",
          style: { stroke: isAiBranch(pr.branch) ? "var(--ok)" : "var(--faint)", strokeDasharray: pr.status === "open" ? undefined : "4 4" },
        });
      }
    });
    return { nodes, edges };
  }, [commits, pullRequests]);

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.15, maxZoom: 1 }} nodesConnectable={false} proOptions={{ hideAttribution: true }} minZoom={0.4}>
        <Background gap={20} size={1} color="var(--border)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

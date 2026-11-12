import { useMemo, useState } from "react";
import { Bot, GitMerge, GitPullRequest } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useApi } from "../lib/hooks";
import useStore from "../store";
import { fullDate, isAiBranch, timeAgo } from "../lib/format";
import { AsyncView, Card, Empty, ExtLink, PageHeader, StatusBadge } from "../components/ui";
import { duration } from "../lib/format";

function CiBadge({ ci }) {
  if (!ci) return <span className="faint text-[12px]" title="No CI checks reported for this commit">—</span>;
  const tone = { passing: "badge-ok", failing: "badge-bad", pending: "badge-warn" }[ci.state];
  const label = ci.state === "pending" ? `running ${ci.total - ci.pending}/${ci.total}` : `${ci.passed}/${ci.total} passed`;
  return (
    <a href={ci.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2" title={ci.checks.map((c) => `${c.name}: ${c.conclusion || c.status}`).join("\n")}>
      <span className={`badge ${tone} normal-case`}><span className={`dot ${ci.state === "pending" ? "pulse" : ""}`} />{label}</span>
      {ci.durationMs != null && <span className="faint text-[12px]">{duration(ci.durationMs)}</span>}
    </a>
  );
}
import RequireRepo from "../components/RequireRepo";

const FILTERS = ["open", "merged", "closed", "all"];

function MergeButton({ repoId, pr, onDone }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const merge = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.mergePr(repoId, pr.number);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };
  if (error) return <span className="text-[12px]" style={{ color: "var(--bad)" }} title={error}>Merge failed: {error.slice(0, 60)}</span>;
  if (!confirm) return <button className="btn" onClick={() => setConfirm(true)}><GitMerge size={14} /> Merge</button>;
  return (
    <span className="inline-flex items-center gap-1">
      <button className="btn btn-primary" onClick={merge} disabled={busy}>{busy ? "Merging…" : "Confirm"}</button>
      <button className="btn btn-ghost" onClick={() => setConfirm(false)} disabled={busy}>Cancel</button>
    </span>
  );
}

export default function PullRequestsPage() {
  return <RequireRepo title="Pull requests">{(r) => <PullRequests key={r.id} repo={r} />}</RequireRepo>;
}

function PullRequests({ repo }) {
  const prs = useApi(() => api.pullRequests(repo.id), [repo.id]);
  const bump = useStore((s) => s.bump);
  const [filter, setFilter] = useState("open");
  const [aiOnly, setAiOnly] = useState(false);

  const list = useMemo(() => (prs.data || [])
    .filter((p) => filter === "all" || p.status === filter)
    .filter((p) => !aiOnly || isAiBranch(p.branch)), [prs.data, filter, aiOnly]);

  const counts = useMemo(() => {
    const c = { all: 0, open: 0, merged: 0, closed: 0 };
    for (const p of prs.data || []) { c.all++; if (c[p.status] != null) c[p.status]++; }
    return c;
  }, [prs.data]);

  return (
    <>
      <PageHeader title="Pull requests" description={`${repo.fullName} · Git-Mind never merges on its own: merging here is your decision.`} />
      <Card
        pad={false}
        title={
          <div className="tabs">
            {FILTERS.map((f) => <button key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)} <span className="faint">{counts[f]}</span></button>)}
          </div>
        }
        actions={<label className="muted inline-flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" checked={aiOnly} onChange={(e) => setAiOnly(e.target.checked)} /> Only AI fixes</label>}
      >
        <AsyncView state={prs} isEmpty={() => list.length === 0} empty={<Empty icon={GitPullRequest} title="No pull requests here" hint="Sync GitHub if you expect to see some." />}>
          {() => (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Pull request</th><th>Branch</th><th>CI</th><th>Author</th><th>Status</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {list.map((pr) => (
                    <tr key={pr._id}>
                      <td style={{ maxWidth: 280 }}>
                        <div className="flex min-w-0 items-center gap-2">
                          {isAiBranch(pr.branch) && <span className="badge badge-ok shrink-0 normal-case"><Bot size={12} /> AI</span>}
                          <a href={pr.url} target="_blank" rel="noreferrer" className="min-w-0 truncate hover:underline" style={{ color: "var(--accent)" }} title={pr.title || ""}>#{pr.number} {pr.title || ""}</a>
                        </div>
                      </td>
                      <td className="mono muted truncate text-[12px]" style={{ maxWidth: 170 }} title={`${pr.branch || ""}${pr.baseBranch ? ` → ${pr.baseBranch}` : ""}`}>{pr.branch || "—"}{pr.baseBranch ? ` → ${pr.baseBranch}` : ""}</td>
                      <td><CiBadge ci={pr.ci} /></td>
                      <td className="muted">{pr.author || "—"}</td>
                      <td><StatusBadge status={pr.status} /></td>
                      <td className="muted" title={fullDate(pr.updatedAt)}>{timeAgo(pr.updatedAt)}</td>
                      <td className="text-right">{pr.status === "open" && <MergeButton repoId={repo.id} pr={pr} onDone={bump} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncView>
      </Card>
    </>
  );
}

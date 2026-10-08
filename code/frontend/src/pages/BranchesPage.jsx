import { useMemo, useState } from "react";
import { Bot, GitBranch, Lock, Trash2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useApi } from "../lib/hooks";
import useStore from "../store";
import { fullDate, isAiBranch, timeAgo } from "../lib/format";
import { AsyncView, Card, Empty, PageHeader } from "../components/ui";
import RequireRepo from "../components/RequireRepo";

const PROTECTED = ["main", "master", "develop", "production"];

function DeleteButton({ repoId, name, onDone }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const del = async () => {
    setBusy(true);
    try {
      await api.deleteBranch(repoId, name);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };
  if (error) return <span className="text-[12px]" style={{ color: "var(--bad)" }} title={error}>{error.slice(0, 50)}</span>;
  if (!confirm) return <button className="btn btn-ghost btn-icon btn-danger" title="Delete branch on GitHub" onClick={() => setConfirm(true)}><Trash2 size={14} /></button>;
  return (
    <span className="inline-flex items-center gap-1">
      <button className="btn btn-danger" onClick={del} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
      <button className="btn btn-ghost" onClick={() => setConfirm(false)} disabled={busy}>Cancel</button>
    </span>
  );
}

export default function BranchesPage() {
  return <RequireRepo title="Branches">{(r) => <Branches key={r.id} repo={r} />}</RequireRepo>;
}

function Branches({ repo }) {
  const branches = useApi(() => api.branches(repo.id), [repo.id]);
  const bump = useStore((s) => s.bump);
  const [query, setQuery] = useState("");

  const list = useMemo(() => (branches.data || [])
    .filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.isDefault - a.isDefault) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)), [branches.data, query]);

  const staleAi = (branches.data || []).filter((b) => isAiBranch(b.name)).length;

  return (
    <>
      <PageHeader title="Branches" description={`${repo.fullName}.${staleAi ? ` ${staleAi} Git-Mind fix branch${staleAi > 1 ? "es" : ""} present.` : ""}`} />
      <Card pad={false} title={<input className="input w-[260px]" placeholder="Filter branches…" value={query} onChange={(e) => setQuery(e.target.value)} />}>
        <AsyncView state={branches} isEmpty={() => list.length === 0} empty={<Empty icon={GitBranch} title="No branches" hint="Sync GitHub to load branches." />}>
          {() => (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Branch</th><th>Ahead of default</th><th>Last commit by</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {list.map((b) => {
                    const locked = b.isDefault || b.protected || PROTECTED.includes(b.name);
                    return (
                      <tr key={b.name}>
                        <td>
                          <div className="flex items-center gap-2">
                            {isAiBranch(b.name) ? <Bot size={14} style={{ color: "var(--ok)" }} /> : <GitBranch size={14} className="muted" />}
                            <span className="mono text-[13px]">{b.name}</span>
                            {b.isDefault && <span className="badge badge-accent">default</span>}
                          </div>
                        </td>
                        <td className="muted">{b.isDefault ? (b.commitCount != null ? `${b.commitCount} commits` : "—") : b.aheadBy != null ? `${b.aheadBy} commit${b.aheadBy === 1 ? "" : "s"}` : "—"}</td>
                        <td className="muted">{b.lastAuthor || "—"}</td>
                        <td className="muted" title={fullDate(b.updatedAt)}>{timeAgo(b.updatedAt)}</td>
                        <td className="text-right">{locked ? <Lock size={14} className="faint" title="Protected" /> : <DeleteButton repoId={repo.id} name={b.name} onDone={bump} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AsyncView>
      </Card>
    </>
  );
}

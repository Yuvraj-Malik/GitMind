import { useMemo, useState } from "react";
import { Bot, Play, RotateCcw, X } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useActiveRepo, useApi } from "../lib/hooks";
import useStore from "../store";
import { duration, fullDate, human, timeAgo } from "../lib/format";
import { AsyncView, Card, Empty, ExtLink, PageHeader, StatusBadge } from "../components/ui";

const FILTERS = ["all", "success", "failed", "running"];

function useQueue() {
  const bump = useStore((s) => s.bump);
  const jobStarted = useStore((s) => s.jobStarted);
  const [state, setState] = useState({ busy: false, msg: null, error: null });
  const run = async (label, fn) => {
    setState({ busy: true, msg: null, error: null });
    try {
      const r = await fn();
      jobStarted({ jobId: r.jobId });
      setState({ busy: false, msg: `Queued job #${r.jobId} for ${label}. Progress shows up below live.`, error: null });
      bump();
    } catch (e) {
      setState({ busy: false, msg: null, error: errorMessage(e) });
    }
  };
  return [state, run];
}

function Feedback({ state }) {
  return (
    <>
      {state.msg && <div className="mt-3 text-[13px]" style={{ color: "var(--ok)" }}>{state.msg}</div>}
      {state.error && <div className="mt-3 text-[13px]" style={{ color: "var(--bad)" }}>{state.error}</div>}
    </>
  );
}

function RepoRunPanel({ repo }) {
  const branches = useApi(() => api.branches(repo.id), [repo.id]);
  const [branch, setBranch] = useState("");
  const [state, run] = useQueue();
  const list = (branches.data || []).filter((b) => !b.name.startsWith("ai/fix-"));
  const selected = branch || repo.defaultBranch || list[0]?.name || "";

  return (
    <Card title={`Run a fix on ${repo.fullName}`} className="mb-6">
      <p className="muted m-0 mb-4 text-[13px]">
        Git-Mind clones the branch, runs its test command (<span className="mono">npm test</span>, or <span className="mono">testCommand</span> from a
        <span className="mono"> .gitmind.json</span> in the repo), asks the model for a patch, re-runs the tests, and opens a pull request into that
        branch only if they pass. {repo.webhookStatus === "active" ? "CI failures on this repo trigger this automatically." : ""}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select className="select min-w-[240px]" value={selected} onChange={(e) => setBranch(e.target.value)} disabled={branches.loading}>
          {list.map((b) => <option key={b.name} value={b.name}>{b.name}{b.isDefault ? " (default)" : ""}</option>)}
        </select>
        <button className="btn btn-primary" disabled={state.busy || !selected} onClick={() => run(`${repo.fullName}@${selected}`, () => api.triggerRepoFix(repo.id, selected))}>
          <Play size={14} /> {state.busy ? "Queuing…" : "Run AI fix"}
        </button>
      </div>
      <Feedback state={state} />
    </Card>
  );
}

function SandboxPanel() {
  const files = useApi(api.sandboxFiles);
  const [file, setFile] = useState("");
  const [state, run] = useQueue();
  if (files.loading || !files.data?.available || !files.data.files.length) return null;
  const target = file || files.data.files[0].path;
  return (
    <Card title="Sandbox demo" className="mb-6">
      <p className="muted m-0 mb-4 text-[13px]">Fix one of the benchmark bugs in your local sandbox repository.</p>
      <div className="flex flex-wrap items-center gap-2">
        <select className="select min-w-[280px]" value={target} onChange={(e) => setFile(e.target.value)}>
          {files.data.files.map((f) => <option key={f.path} value={f.path}>{f.path}</option>)}
        </select>
        <button className="btn" disabled={state.busy} onClick={() => run(target, () => api.triggerFix(target))}>
          <Play size={14} /> {state.busy ? "Queuing…" : "Run on sandbox"}
        </button>
      </div>
      <Feedback state={state} />
    </Card>
  );
}

function RetryButton({ run }) {
  const [state, setState] = useState({ busy: false, msg: null, error: null });
  const jobStarted = useStore((s) => s.jobStarted);
  const bump = useStore((s) => s.bump);
  const retry = async () => {
    setState({ busy: true, msg: null, error: null });
    try {
      const r = await api.retryRun(run._id);
      jobStarted({ jobId: r.jobId });
      setState({ busy: false, msg: `Queued as job #${r.jobId}`, error: null });
      bump();
    } catch (e) {
      setState({ busy: false, msg: null, error: errorMessage(e) });
    }
  };
  return (
    <span className="inline-flex items-center gap-2">
      {state.msg && <span className="text-[12px]" style={{ color: "var(--ok)" }}>{state.msg}</span>}
      {state.error && <span className="text-[12px]" style={{ color: "var(--bad)" }}>{state.error}</span>}
      <button className="btn" onClick={retry} disabled={state.busy || !!state.msg}><RotateCcw size={14} /> {state.busy ? "Queuing…" : "Re-run"}</button>
    </span>
  );
}

function RunDetail({ run, onClose }) {
  const live = useStore((s) => s.activeJobs[run.jobId]);
  const stage = live?.stage || run.stage;
  const canRetry = ["failed", "skipped"].includes(run.status);
  return (
    <Card
      title={<span className="inline-flex items-center gap-2">Run {run.jobId ? `#${run.jobId}` : ""} <StatusBadge status={run.status} /></span>}
      actions={
        <span className="inline-flex items-center gap-2">
          {canRetry && <RetryButton key={run._id} run={run} />}
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={15} /></button>
        </span>
      }
      className="mt-6"
    >
      {(run.status === "running" || run.status === "queued") && (
        <div className="mb-4 flex items-center gap-2 text-[13px]" style={{ color: "var(--warn)" }}>
          <span className="dot pulse" /> {stage || (run.status === "queued" ? "Waiting for the worker…" : "Working…")}
        </div>
      )}
      <dl className="m-0 mb-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] md:grid-cols-4">
        {[
          ["Target", run.filePath || run.repoName || "—"],
          ["Trigger", run.trigger || "—"],
          ["Attempts", run.attempt ?? "—"],
          ["Duration", duration(run.durationMs)],
          ["Failed at", run.failedAt ? human(run.failedAt) : "—"],
          ["Branch", run.branch || run.headBranch || run.baseBranch || "—"],
          ["Started", fullDate(run.createdAt)],
          ["Pull request", run.prUrl ? <ExtLink href={run.prUrl}>Open PR</ExtLink> : "—"],
        ].map(([k, v]) => (
          <div key={k}><dt className="faint text-[12px]">{k}</dt><dd className="m-0 mt-0.5 truncate font-medium">{v}</dd></div>
        ))}
      </dl>
      {run.reasoning && (
        <>
          <div className="muted mb-1 text-[12px] font-medium">{run.status === "success" ? "What the model changed" : "Details"}</div>
          <p className="m-0 mb-4 text-[13px] leading-6">{run.reasoning}</p>
        </>
      )}
      <div className="muted mb-1 text-[12px] font-medium">Failing test output</div>
      <pre className="console max-h-[340px]">{run.errorLog || "No test output was recorded for this run."}</pre>
    </Card>
  );
}

export default function AiFixesPage() {
  const activeJobs = useStore((s) => s.activeJobs);
  const repo = useActiveRepo();
  const runs = useApi(() => api.aiLogs(repo?.id), [repo?.id]);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(() => {
    const d = runs.data || [];
    if (filter === "all") return d;
    if (filter === "running") return d.filter((r) => r.status === "running" || r.status === "queued");
    return d.filter((r) => r.status === filter);
  }, [runs.data, filter]);
  const selected = (runs.data || []).find((r) => r._id === selectedId);

  return (
    <>
      <PageHeader title="AI Fixes" description="Every fixer run, whether you triggered it here or CI triggered it through the webhook." />
      {repo && <RepoRunPanel key={repo.id} repo={repo} />}
      <SandboxPanel />
      <Card
        title="Runs"
        pad={false}
        actions={
          <div className="tabs">
            {FILTERS.map((f) => <button key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}
          </div>
        }
      >
        <AsyncView state={runs} isEmpty={() => filtered.length === 0} empty={<Empty icon={Bot} title={filter === "all" ? "No runs yet" : `No ${filter} runs`} hint="Runs appear here as soon as they're queued." />}>
          {() => (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Status</th><th>Target</th><th>Trigger</th><th>Attempts</th><th>Duration</th><th>When</th><th>PR</th></tr></thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r._id} className={`clickable ${r._id === selectedId ? "selected" : ""}`} onClick={() => setSelectedId(r._id === selectedId ? null : r._id)}>
                      <td>
                        <StatusBadge status={r.status} label={r.status === "failed" && r.failedAt ? `failed · ${human(r.failedAt)}` : undefined} />
                        {(r.status === "running" || r.status === "queued") && (activeJobs[r.jobId]?.stage || r.stage) && (
                          <div className="faint mt-1 max-w-[260px] truncate text-[11px]">{activeJobs[r.jobId]?.stage || r.stage}</div>
                        )}
                      </td>
                      <td className="mono max-w-[260px] truncate text-[12px]">{r.filePath || r.repoName || "—"}</td>
                      <td className="muted capitalize">{r.trigger || "—"}</td>
                      <td className="muted">{r.attempt ?? "—"}</td>
                      <td className="muted">{duration(r.durationMs)}</td>
                      <td className="muted" title={fullDate(r.updatedAt)}>{timeAgo(r.updatedAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>{r.prUrl ? <ExtLink href={r.prUrl}>View</ExtLink> : <span className="faint">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncView>
      </Card>
      {selected && <RunDetail run={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}

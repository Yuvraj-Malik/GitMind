import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bot, Clock3, FolderGit2, GitBranch, GitPullRequest, RefreshCw } from "lucide-react";
import Topbar from "../topbar/Topbar";
import useAppStore from "../../store/appStore";
import {
  fetchActivity,
  fetchAiLogs,
  fetchBranches,
  fetchPullRequests,
  fetchRepositories,
  fetchRepositoryCommits,
} from "../../services/dashboardService";
import { formatStatus, getStatusTone } from "../../utils/statusAppearance";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function displayDate(value) {
  return value ? dateFormatter.format(new Date(value)) : "Not available";
}

function useBackendData(loader, dependencies = []) {
  const [state, setState] = useState({ loading: true, error: null, data: [] });
  const reload = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await loader();
      setState({ loading: false, error: null, data: Array.isArray(data) ? data : [] });
    } catch (error) {
      setState({ loading: false, error: error?.response?.data?.message || error?.message || "Unable to load backend data.", data: [] });
    }
  }, dependencies); // dependency values determine the current API query

  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

function BackendPage({ title, description, icon: Icon, children }) {
  const token = useAppStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <main className="workspace-shell flex min-h-[calc(100vh-32px)] flex-col"><Topbar /><section className="min-h-0 flex-1 overflow-auto p-8"><div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-sky-400/40 bg-sky-500/10 text-sky-300"><Icon size={20} /></span><div><h1 className="m-0 text-xl font-semibold">{title}</h1><p className="mt-1 text-sm text-slate-400">{description}</p></div></div></div>{children}</section></main>;
}

function LoadState({ loading, error, empty, children, onRetry }) {
  if (loading) return <div className="grid min-h-70 place-items-center rounded-2xl border border-dashed border-slate-500/40 p-7 text-center text-slate-400">Loading backend data…</div>;
  if (error) return <div className="grid min-h-80 place-items-center rounded-2xl border border-rose-300/70 bg-rose-50/35 p-7 text-center"><div className="max-w-md"><span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-rose-100 text-xl text-rose-700">!</span><h2 className="m-0 text-lg font-semibold text-stone-800">Backend connection unavailable</h2><p className="mt-2 text-sm leading-6 text-stone-600">Git-Mind couldn’t load live workspace data. Start the backend service, then try again.</p><p className="mt-2 text-xs text-stone-500">{error}</p><button className="mt-5 inline-flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-amber-50 shadow-sm transition hover:bg-stone-700" onClick={onRetry}><RefreshCw size={15} /> Try again</button></div></div>;
  if (empty) return <div className="grid min-h-70 place-items-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/45 p-7 text-center text-stone-500">No records have been received from the backend yet.</div>;
  return children;
}

export function RepositoriesPage() {
  const { data: repositories, loading, error, reload } = useBackendData(fetchRepositories, []);
  const [expandedId, setExpandedId] = useState(null);
  const [commits, setCommits] = useState([]);
  const [commitError, setCommitError] = useState(null);
  const showCommits = async (id) => {
    if (expandedId === id) return setExpandedId(null);
    setExpandedId(id); setCommits([]); setCommitError(null);
    try { setCommits(await fetchRepositoryCommits(id)); } catch (requestError) { setCommitError(requestError?.message || "Unable to load commits."); }
  };
  return <BackendPage title="Repositories" description="Tracked repositories supplied by the workspace API." icon={FolderGit2}>
    <PageTools reload={reload} />
    <LoadState loading={loading} error={error} empty={!repositories.length} onRetry={reload}><div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">{repositories.map((repo) => <article className="grid gap-3 rounded-xl border border-slate-500/25 bg-slate-950/35 p-4" key={repo._id || repo.id}><h2 className="m-0 text-base font-semibold">{repo.owner ? `${repo.owner}/` : ""}{repo.name}</h2><a className="w-fit text-sm text-sky-300 hover:text-sky-200" href={repo.url} target="_blank" rel="noreferrer">Open repository</a><dl className="m-0 grid grid-cols-2 gap-2 text-sm"><div className="border-t border-slate-500/20 pt-2"><dt className="text-xs text-slate-400">Commits stored</dt><dd className="m-0 mt-1">{repo.commits?.length || 0}</dd></div><div className="border-t border-slate-500/20 pt-2"><dt className="text-xs text-slate-400">Last synced</dt><dd className="m-0 mt-1">{displayDate(repo.updatedAt)}</dd></div></dl><button className="inline-flex w-fit items-center rounded-lg border border-sky-400/45 bg-sky-950/35 px-3 py-2 text-sm text-sky-100" onClick={() => showCommits(repo._id || repo.id)}>{expandedId === (repo._id || repo.id) ? "Hide commits" : "View commits"}</button>{expandedId === (repo._id || repo.id) && <CommitList commits={commits} error={commitError} />}</article>)}</div></LoadState>
  </BackendPage>;
}

function CommitList({ commits, error }) { if (error) return <p className="m-0 text-sm text-rose-200">{error}</p>; if (!commits.length) return <p className="m-0 text-sm text-slate-400">No commit records for this repository.</p>; return <ul className="m-0 grid max-h-48 list-none gap-2 overflow-auto p-0 text-sm">{commits.map((commit, index) => <li className="flex justify-between gap-3 text-slate-200" key={commit.id || commit.sha || index}><strong>{commit.title || commit.message || commit.sha || "Commit"}</strong><span className="whitespace-nowrap text-slate-400">{commit.branch || "No branch"}</span></li>)}</ul>; }

export function BranchesPage() {
  const activeRepositoryId = useAppStore((state) => state.activeRepositoryId);
  const { data, loading, error, reload } = useBackendData(() => fetchBranches(activeRepositoryId), [activeRepositoryId]);
  return <BackendPage title="Branches" description="Branches observed in the tracked repository commit history." icon={GitBranch}><PageTools reload={reload} /><LoadState loading={loading} error={error} empty={!data.length} onRetry={reload}><Table headers={["Branch", "Repository", "Commits", "Latest activity"]} rows={data.map((branch) => [branch.name, branch.repositoryName, branch.commitCount, displayDate(branch.updatedAt)])} /></LoadState></BackendPage>;
}

export function PullRequestsPage() {
  const activeRepositoryId = useAppStore((state) => state.activeRepositoryId);
  const { data, loading, error, reload } = useBackendData(() => fetchPullRequests(activeRepositoryId), [activeRepositoryId]);
  return <BackendPage title="Pull Requests" description="Webhook-backed pull request status records." icon={GitPullRequest}><PageTools reload={reload} /><LoadState loading={loading} error={error} empty={!data.length} onRetry={reload}><Table headers={["Pull request", "Title", "Status", "Updated"]} rows={data.map((pr) => [`#${pr.number}`, pr.title || "No title received", <Status value={pr.status} />, displayDate(pr.updatedAt)])} /></LoadState></BackendPage>;
}

export function ActivityPage() {
  const { data, loading, error, reload } = useBackendData(fetchActivity, []);
  return <BackendPage title="Activity Feed" description="Recent webhook and AI workflow activity recorded by the backend." icon={Clock3}><PageTools reload={reload} /><LoadState loading={loading} error={error} empty={!data.length} onRetry={reload}><ol className="m-0 grid list-none gap-5 p-0">{data.map((item) => <li className="grid grid-cols-[16px_1fr] gap-3" key={item.id}><span className={`mt-1 size-3 rounded-full ring-4 ${item.type === "ai" ? "bg-emerald-300 ring-emerald-400/10" : "bg-sky-300 ring-sky-400/10"}`} /><div><strong className="text-sm">{item.title}</strong>{item.detail && <p className="my-1 text-sm text-slate-400">{item.detail}</p>}<small className="text-xs text-slate-400"><Status value={item.status} /> · {displayDate(item.createdAt)}</small></div></li>)}</ol></LoadState></BackendPage>;
}

export function AiAgentsPage() {
  const { data, loading, error, reload } = useBackendData(fetchAiLogs, []);
  return <BackendPage title="AI Agents" description="AI workflow jobs persisted by the backend." icon={Bot}><PageTools reload={reload} /><LoadState loading={loading} error={error} empty={!data.length} onRetry={reload}><div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">{data.map((log) => <article className="grid gap-3 rounded-xl border border-slate-500/25 bg-slate-950/35 p-4" key={log._id || log.id}><div className="flex items-center justify-between gap-3"><h2 className="m-0 text-base font-semibold">{log.action || "AI workflow"}</h2><Status value={log.status} /></div><p className="m-0 text-sm text-slate-400">{log.reasoning || "No reasoning was recorded for this job."}</p><small className="text-xs text-slate-400">Job {log.jobId || "not assigned"} · {displayDate(log.updatedAt || log.createdAt)}</small></article>)}</div></LoadState></BackendPage>;
}

function PageTools({ reload }) { return <div className="mb-4 flex justify-end"><button className="page-refresh inline-flex items-center gap-2 rounded-lg border border-sky-400/45 bg-sky-950/35 px-3 py-2 text-sm text-sky-100" onClick={reload}><RefreshCw size={15} /> Refresh</button></div>; }
function Status({ value }) { const tone = getStatusTone(value); const colors = { success: "border-emerald-400/40 bg-emerald-950/40 text-emerald-200", warning: "border-amber-400/40 bg-amber-950/40 text-amber-200", danger: "border-rose-400/40 bg-rose-950/40 text-rose-200", neutral: "border-slate-400/40 bg-slate-800/70 text-slate-300" }; return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs capitalize ${colors[tone]}`}>{formatStatus(value)}</span>; }
function Table({ headers, rows }) { return <div className="overflow-x-auto rounded-xl border border-slate-500/25"><table className="min-w-160 w-full border-collapse"><thead><tr>{headers.map((header) => <th className="border-b border-slate-500/20 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400" key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td className="border-b border-slate-500/15 px-4 py-3 text-sm last:border-b-0" key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>; }

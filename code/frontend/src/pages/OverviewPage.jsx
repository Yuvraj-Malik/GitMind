import { Link } from "react-router-dom";
import { Activity, ArrowRight, Bot, GitBranch } from "lucide-react";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import { duration, percent, timeAgo, human } from "../lib/format";
import { AsyncView, Card, Empty, ErrorState, ExtLink, Loading, PageHeader, Stat, StatusBadge } from "../components/ui";
import Topology from "../components/Topology";
import RequireRepo from "../components/RequireRepo";

export default function OverviewPage() {
  return <RequireRepo title="Overview">{(r) => <Overview key={r.id} repoId={r.id} />}</RequireRepo>;
}

function Overview({ repoId }) {
  const overview = useApi(() => api.overview(repoId), [repoId]);
  const graph = useApi(async () => {
    const [repo, pullRequests] = await Promise.all([api.repo(repoId), api.pullRequests(repoId)]);
    return { repo, pullRequests };
  }, [repoId]);
  const runs = useApi(() => api.aiLogs(repoId), [repoId]);
  const activity = useApi(() => api.activity(repoId), [repoId]);

  const o = overview.data;
  const repo = o?.repository;

  return (
    <>
      <PageHeader
        title="Overview"
        description={repo ? <><ExtLink href={repo.url}>{repo.fullName}</ExtLink> · {repo.lastSyncedAt ? `synced ${timeAgo(repo.lastSyncedAt)}` : "not synced yet"}{repo.syncError ? ` · ${repo.syncError}` : ""}</> : ""}
      />

      {overview.loading ? <Loading /> : overview.error && !o ? <ErrorState message={overview.error} onRetry={overview.reload} /> : (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Open pull requests" value={o.pullRequests.open} hint={`${o.pullRequests.aiOpen} opened by Git-Mind`} />
          <Stat label="AI fix success rate" value={percent(o.aiRuns.successRate)} hint={`${o.aiRuns.success} of ${o.aiRuns.total} completed runs`} tone={o.aiRuns.successRate == null ? undefined : o.aiRuns.successRate >= 0.5 ? "ok" : "warn"} />
          <Stat label="AI runs this week" value={o.aiRuns.last7Days} hint={o.aiRuns.last ? `last ${timeAgo(o.aiRuns.last.updatedAt)}` : "no runs yet"} />
          <Stat label="Avg. time to fix" value={duration(o.aiRuns.avgDurationMs)} hint="from trigger to PR" />
        </div>
      )}

      <Card title="Repository topology" className="mb-6" pad={false} actions={<span className="faint text-[12px]">default branch · latest pull requests</span>}>
        <AsyncView
          state={graph}
          isEmpty={(d) => !d.repo?.commits?.length}
          empty={<Empty icon={GitBranch} title="Nothing to draw yet" hint="Sync GitHub to load commits and pull requests." />}
        >
          {(d) => <Topology commits={d.repo.commits} pullRequests={d.pullRequests} />}
        </AsyncView>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Recent AI runs" actions={<Link to="/ai" className="muted inline-flex items-center gap-1 text-[12px] hover:underline">All runs <ArrowRight size={12} /></Link>}>
          <AsyncView state={runs} isEmpty={(d) => !d.length} empty={<Empty icon={Bot} title="No AI runs yet" hint="Run one from the AI Fixes page, or let CI trigger one." />}>
            {(d) => (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {d.slice(0, 5).map((r) => (
                  <li key={r._id} className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{r.filePath || r.repoName || "—"}</div>
                      <div className="faint truncate text-[12px]">{r.status === "failed" ? `Failed at ${human(r.failedAt)}` : r.reasoning || r.action}</div>
                    </div>
                    <span className="faint shrink-0 text-[12px]">{timeAgo(r.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </AsyncView>
        </Card>

        <Card title="Recent activity" actions={<Link to="/activity" className="muted inline-flex items-center gap-1 text-[12px] hover:underline">View all <ArrowRight size={12} /></Link>}>
          <AsyncView state={activity} isEmpty={(d) => !d.length} empty={<Empty icon={Activity} title="No activity yet" />}>
            {(d) => (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {d.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <span className="dot shrink-0" style={{ color: a.type === "ai" ? "var(--ok)" : "var(--info)" }} />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{a.title}</span>
                    <span className="faint shrink-0 text-[12px]">{timeAgo(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </AsyncView>
        </Card>
      </div>
    </>
  );
}

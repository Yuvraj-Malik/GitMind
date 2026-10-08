import { useMemo, useState } from "react";
import { Check, FolderGit2, Lock, Plus, RefreshCw, Search, Unplug, Webhook } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useApi } from "../lib/hooks";
import useStore from "../store";
import { timeAgo } from "../lib/format";
import { AsyncView, Card, Empty, ExtLink, PageHeader } from "../components/ui";

const WEBHOOK = {
  active: ["badge-ok", "Auto-fix on CI failure"],
  not_configured: ["", "Manual runs only"],
  error: ["badge-bad", "Webhook error"],
};

function ConnectedRow({ repo, onChanged }) {
  const setActiveRepo = useStore((s) => s.setActiveRepo);
  const activeRepoId = useStore((s) => s.activeRepoId);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(false);

  const act = async (kind, fn) => {
    setBusy(kind);
    setError(null);
    try { await fn(); await onChanged(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(null); setConfirm(false); }
  };
  const [tone, label] = WEBHOOK[repo.webhookStatus] || WEBHOOK.not_configured;

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <ExtLink href={repo.url}><span className="font-medium">{repo.fullName}</span></ExtLink>
          {repo.private && <span className="badge normal-case"><Lock size={11} /> private</span>}
          {repo.id === activeRepoId && <span className="badge badge-accent">selected</span>}
        </div>
        <div className="muted mt-1 flex flex-wrap items-center gap-3 text-[12px]">
          <span className={`badge ${tone} normal-case`} title={repo.webhookError || ""}><Webhook size={11} /> {label}</span>
          <span>{repo.lastSyncedAt ? `Synced ${timeAgo(repo.lastSyncedAt)}` : "Never synced"}</span>
          {repo.syncError && <span style={{ color: "var(--bad)" }}>{repo.syncError}</span>}
        </div>
        {repo.webhookStatus !== "active" && repo.webhookError && <div className="faint mt-1 text-[12px]">{repo.webhookError}</div>}
        {error && <div className="mt-1 text-[12px]" style={{ color: "var(--bad)" }}>{error}</div>}
      </div>
      <div className="flex items-center gap-1">
        {repo.id !== activeRepoId && <button className="btn" onClick={() => setActiveRepo(repo.id)}>Select</button>}
        <button className="btn" onClick={() => act("sync", () => api.syncRepo(repo.id))} disabled={!!busy}>
          <RefreshCw size={14} className={busy === "sync" ? "spin" : ""} /> Sync
        </button>
        {repo.webhookStatus !== "active" && (
          <button className="btn" onClick={() => act("hook", () => api.retryWebhook(repo.id))} disabled={!!busy} title="Try to install the webhook again">
            <Webhook size={14} /> {busy === "hook" ? "Installing…" : "Retry webhook"}
          </button>
        )}
        {confirm ? (
          <>
            <button className="btn btn-danger" onClick={() => act("disc", () => api.disconnectRepo(repo.id))} disabled={!!busy}>{busy === "disc" ? "Disconnecting…" : "Disconnect"}</button>
            <button className="btn btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-ghost btn-icon btn-danger" title="Disconnect (removes the webhook; nothing on GitHub is deleted)" onClick={() => setConfirm(true)}><Unplug size={14} /></button>
        )}
      </div>
    </div>
  );
}

function GithubRepoList({ onConnected }) {
  const gh = useApi(api.githubRepos);
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("all");
  const [busy, setBusy] = useState(null);
  const [errors, setErrors] = useState({});

  const owners = useMemo(() => [...new Set((gh.data || []).map((r) => r.owner))].sort(), [gh.data]);
  const list = useMemo(() => (gh.data || [])
    .filter((r) => owner === "all" || r.owner === owner)
    .filter((r) => r.fullName.toLowerCase().includes(query.toLowerCase())), [gh.data, owner, query]);

  const connect = async (r) => {
    setBusy(r.fullName);
    setErrors((e) => ({ ...e, [r.fullName]: null }));
    try {
      const repo = await api.connectRepo(r.fullName);
      await onConnected(repo);
      gh.reload();
    } catch (e) {
      setErrors((x) => ({ ...x, [r.fullName]: errorMessage(e) }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      title="Your GitHub repositories"
      pad={false}
      actions={
        <div className="flex items-center gap-2">
          <select className="select" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="all">All owners</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <div className="relative">
            <Search size={14} className="faint absolute top-[10px] left-[10px]" />
            <input className="input w-[240px] pl-8" placeholder="Search repositories…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
      }
    >
      <AsyncView state={gh} isEmpty={() => list.length === 0} empty={<Empty icon={FolderGit2} title="No repositories match" />}>
        {() => (
          <div className="max-h-[560px] overflow-auto">
            {list.map((r, i) => (
              <div key={r.githubId} className={`flex items-center gap-4 px-5 py-3 ${i ? "divider" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{r.fullName}</span>
                    {r.private && <Lock size={12} className="faint" />}
                    {r.archived && <span className="badge">archived</span>}
                  </div>
                  <div className="faint mt-0.5 truncate text-[12px]">
                    {[r.language, r.pushedAt && `pushed ${timeAgo(r.pushedAt)}`, r.description].filter(Boolean).join(" · ")}
                  </div>
                  {errors[r.fullName] && <div className="mt-1 text-[12px]" style={{ color: "var(--bad)" }}>{errors[r.fullName]}</div>}
                </div>
                {r.connectedId ? (
                  <span className="badge badge-ok"><Check size={12} /> Connected</span>
                ) : (
                  <button className="btn" onClick={() => connect(r)} disabled={!!busy || r.archived || !r.canPush} title={!r.canPush ? "You need write access to open fix pull requests" : ""}>
                    {busy === r.fullName ? <><RefreshCw size={14} className="spin" /> Connecting…</> : <><Plus size={14} /> Connect</>}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </AsyncView>
    </Card>
  );
}

export default function RepositoriesPage() {
  const { repos, loadRepos, setActiveRepo, reposLoaded } = useStore();

  const onConnected = async (repo) => {
    await loadRepos();
    if (repo?.id) setActiveRepo(repo.id);
  };

  return (
    <>
      <PageHeader title="Repositories" description="Connect any repository you can push to. Git-Mind syncs it and, when a public webhook URL is set, fixes CI failures automatically." />
      <Card title={`Connected (${repos.length})`} pad={false} className="mb-6">
        {!reposLoaded ? null : repos.length === 0 ? (
          <div className="muted px-5 pb-5 text-[13px]">Nothing connected yet. Pick a repository below.</div>
        ) : (
          repos.map((r, i) => <div key={r.id} className={i ? "divider" : ""}><ConnectedRow repo={r} onChanged={loadRepos} /></div>)
        )}
      </Card>
      <GithubRepoList onConnected={onConnected} />
    </>
  );
}

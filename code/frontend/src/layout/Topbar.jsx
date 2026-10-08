import { useState } from "react";
import { LogOut, Moon, RefreshCw, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useStore from "../store";
import { api, errorMessage } from "../lib/api";
import { useActiveRepo } from "../lib/hooks";
import NotificationBell from "./NotificationBell";

const CONN = {
  live: ["var(--ok)", "Live"],
  connecting: ["var(--warn)", "Connecting"],
  offline: ["var(--bad)", "Offline"],
};

export default function Topbar() {
  const { connection, user, theme, toggleTheme, logout, bump } = useStore();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const navigate = useNavigate();
  const [color, label] = CONN[connection];
  const repo = useActiveRepo();
  const loadRepos = useStore((s) => s.loadRepos);

  const sync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await api.syncRepo(repo.id);
      await loadRepos();
      bump();
    } catch (e) {
      setSyncError(errorMessage(e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-6" style={{ borderColor: "var(--border)" }}>
      <span className="muted inline-flex items-center gap-2 text-[12px]" title="Real-time connection to the backend">
        <span className="dot" style={{ color }} /> {label}
      </span>
      {syncError && <span className="badge badge-bad max-w-[420px] truncate normal-case" title={syncError}>{syncError}</span>}
      <div className="ml-auto flex items-center gap-1">
        {repo && <button className="btn" onClick={sync} disabled={syncing} title={`Pull latest branches, commits and PRs of ${repo.fullName}`}>
          <RefreshCw size={14} className={syncing ? "spin" : ""} /> {syncing ? "Syncing" : "Sync"}
        </button>}
        <NotificationBell />
        <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="mx-2 h-6 w-px" style={{ background: "var(--border)" }} />
        {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-7 rounded-full" /> : <span className="grid size-7 place-items-center rounded-full text-[12px] font-semibold" style={{ background: "var(--panel-2)" }}>{(user?.username || "?")[0]?.toUpperCase()}</span>}
        <span className="mr-1 text-[13px] font-medium">{user?.username || ""}</span>
        <button className="btn btn-ghost btn-icon" title="Log out" onClick={() => { logout(); navigate("/login", { replace: true }); }}>
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}

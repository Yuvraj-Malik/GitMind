import { useEffect, useRef, useState } from "react";
import { Activity, Bot, Check, ChevronsUpDown, FolderGit2, GitBranch, GitPullRequest, Home, Lock, Plus, Settings } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import useStore from "../store";
import { useActiveRepo } from "../lib/hooks";

const NAV = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/ai", label: "AI Fixes", icon: Bot },
  { to: "/pulls", label: "Pull requests", icon: GitPullRequest },
  { to: "/branches", label: "Branches", icon: GitBranch },
  { to: "/activity", label: "Activity", icon: Activity },
];

function RepoSwitcher() {
  const repos = useStore((s) => s.repos);
  const setActiveRepo = useStore((s) => s.setActiveRepo);
  const active = useActiveRepo();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!repos.length) {
    return (
      <button className="btn mb-5 w-full justify-center" onClick={() => navigate("/repos")}>
        <Plus size={14} /> Connect a repository
      </button>
    );
  }

  return (
    <div className="relative mb-5" ref={ref}>
      <button className="card flex w-full items-center gap-2 px-3 py-2 text-left" onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
        <FolderGit2 size={15} className="muted shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="faint truncate text-[11px]">{active?.owner}</div>
          <div className="truncate text-[13px] font-medium">{active?.name}</div>
        </div>
        <ChevronsUpDown size={14} className="faint shrink-0" />
      </button>
      {open && (
        <div className="popover left-0 w-[260px] py-1" style={{ right: "auto" }}>
          <div className="max-h-[320px] overflow-auto">
            {repos.map((r) => (
              <button key={r.id} onClick={() => { setActiveRepo(r.id); setOpen(false); }} className="flex w-full items-center gap-2 border-0 bg-transparent px-3 py-2 text-left hover:bg-[var(--panel-2)]" style={{ cursor: "pointer" }}>
                <span className="min-w-0 flex-1 truncate text-[13px]">{r.fullName}</span>
                {r.private && <Lock size={12} className="faint" />}
                {r.id === active?.id && <Check size={14} style={{ color: "var(--accent)" }} />}
              </button>
            ))}
          </div>
          <div className="divider mt-1 pt-1">
            <button onClick={() => { setOpen(false); navigate("/repos"); }} className="muted flex w-full items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-[13px] hover:bg-[var(--panel-2)]" style={{ cursor: "pointer" }}>
              <Plus size={14} /> Manage repositories
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const activeJobs = useStore((s) => Object.keys(s.activeJobs).length);
  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r px-3 py-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
      <div className="mb-5 flex items-center gap-2 px-2">
        <span className="grid size-7 place-items-center rounded-lg text-white" style={{ background: "var(--accent)" }}>
          <GitBranch size={15} strokeWidth={2.5} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Git-Mind</span>
      </div>
      <RepoSwitcher />
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {to === "/ai" && activeJobs > 0 && <span className="badge badge-warn"><span className="dot pulse" />{activeJobs}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1">
        <NavLink to="/repos" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <FolderGit2 size={16} /> Repositories
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <Settings size={16} /> Settings
        </NavLink>
      </div>
    </aside>
  );
}

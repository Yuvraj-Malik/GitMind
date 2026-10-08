import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, AlertCircle, GitMerge, CircleSlash, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useStore from "../store";
import { timeAgo } from "../lib/format";

const ICONS = {
  ai_fix_success: [CheckCircle2, "var(--ok)"],
  ai_fix_failed: [AlertCircle, "var(--bad)"],
  ai_fix_skipped: [CircleSlash, "var(--muted)"],
  check_failed: [TriangleAlert, "var(--warn)"],
  pr_merged: [GitMerge, "var(--accent)"],
};

export default function NotificationBell() {
  const { notifications, unread, loadNotifications, markAllRead } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { loadNotifications(); }, [loadNotifications]);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const openItem = (n) => {
    setOpen(false);
    if (!n.link) return;
    if (n.link.startsWith("http")) window.open(n.link, "_blank", "noreferrer");
    else navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button className="btn btn-ghost btn-icon relative" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold text-white" style={{ background: "var(--bad)" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="popover w-[360px]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-semibold">Notifications</span>
            {unread > 0 && <button className="btn btn-ghost h-7 px-2 text-[12px]" onClick={markAllRead}>Mark all read</button>}
          </div>
          <div className="divider max-h-[420px] overflow-auto">
            {notifications.length === 0 ? (
              <div className="muted px-4 py-10 text-center text-[13px]">No notifications yet. You'll see AI fix results and CI failures here.</div>
            ) : (
              notifications.map((n) => {
                const [Icon, color] = ICONS[n.type] || [Bell, "var(--muted)"];
                return (
                  <button key={n._id} onClick={() => openItem(n)} className="flex w-full gap-3 border-0 px-4 py-3 text-left hover:bg-[var(--panel-2)]" style={{ background: n.read ? "transparent" : "var(--accent-soft)", cursor: n.link ? "pointer" : "default" }}>
                    <Icon size={16} style={{ color, marginTop: 2, flexShrink: 0 }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">{n.title}</div>
                      {n.body && <div className="muted mt-0.5 line-clamp-2 text-[12px]">{n.body}</div>}
                      <div className="faint mt-1 text-[11px]">{timeAgo(n.createdAt)}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import { fullDate, timeAgo } from "../lib/format";
import { AsyncView, Card, Empty, ExtLink, PageHeader, StatusBadge } from "../components/ui";
import RequireRepo from "../components/RequireRepo";

const FILTERS = [["all", "All"], ["ai", "AI runs"], ["pull_request", "Pull requests"]];

function dayLabel(d) {
  const date = new Date(d);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === y.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default function ActivityPage() {
  return <RequireRepo title="Activity">{(r) => <ActivityView key={r.id} repo={r} />}</RequireRepo>;
}

function ActivityView({ repo }) {
  const activity = useApi(() => api.activity(repo.id), [repo.id]);
  const [filter, setFilter] = useState("all");

  const groups = useMemo(() => {
    const items = (activity.data || []).filter((a) => filter === "all" || a.type === filter);
    const map = new Map();
    for (const a of items) {
      const k = a.createdAt ? dayLabel(a.createdAt) : "Unknown date";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(a);
    }
    return [...map.entries()];
  }, [activity.data, filter]);

  return (
    <>
      <PageHeader
        title="Activity"
        description={`AI runs and pull request changes in ${repo.fullName}.`}
        actions={<div className="tabs">{FILTERS.map(([k, l]) => <button key={k} className={`tab ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{l}</button>)}</div>}
      />
      <AsyncView state={activity} isEmpty={() => groups.length === 0} empty={<Card><Empty icon={Activity} title="No activity yet" /></Card>}>
        {() => (
          <div className="flex flex-col gap-6">
            {groups.map(([day, items]) => (
              <Card key={day} title={day}>
                <ul className="m-0 flex list-none flex-col p-0">
                  {items.map((a, i) => (
                    <li key={a.id} className={`flex items-start gap-3 py-3 ${i ? "divider" : ""}`}>
                      <span className="dot mt-1.5 shrink-0" style={{ color: a.type === "ai" ? "var(--ok)" : "var(--info)" }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium">{a.link ? <ExtLink href={a.link}>{a.title}</ExtLink> : a.title}</div>
                        {a.detail && <div className="muted mt-0.5 line-clamp-2 text-[12px]">{a.detail}</div>}
                      </div>
                      {a.status && <StatusBadge status={a.status} />}
                      <span className="faint w-[90px] shrink-0 text-right text-[12px]" title={fullDate(a.createdAt)}>{timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </AsyncView>
    </>
  );
}

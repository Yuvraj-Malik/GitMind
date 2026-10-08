import { CheckCircle2, CircleX, Moon, Sun } from "lucide-react";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import useStore from "../store";
import { fullDate } from "../lib/format";
import { AsyncView, Card, PageHeader } from "../components/ui";

const LABELS = {
  api: "Backend API",
  database: "MongoDB",
  redis: "Redis (job queue)",
  worker: "AI worker process",
  github: "Your GitHub access",
  llm: "LLM provider",
  webhook: "Webhook secret",
  sandbox: "Sandbox repository (optional)",
  publicUrl: "Public webhook URL",
};

export default function SettingsPage() {
  const status = useApi(api.systemStatus);
  const { user, theme, toggleTheme } = useStore();

  return (
    <>
      <PageHeader title="Settings" description="Live health of every service Git-Mind depends on." actions={<button className="btn" onClick={status.reload}>Re-check</button>} />
      <Card title="System status" pad={false} className="mb-6">
        <AsyncView state={status}>
          {(d) => (
            <>
              <table className="table">
                <tbody>
                  {Object.entries(d.services).filter(([, s]) => s).map(([k, s]) => (
                    <tr key={k}>
                      <td className="w-[240px] font-medium">{LABELS[k] || k}</td>
                      <td>
                        <span className="inline-flex items-center gap-2" style={{ color: s.ok ? "var(--ok)" : "var(--bad)" }}>
                          {s.ok ? <CheckCircle2 size={15} /> : <CircleX size={15} />} {s.ok ? "OK" : "Problem"}
                        </span>
                      </td>
                      <td className="muted">{s.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {d.queue && (
                <div className="divider muted flex flex-wrap gap-6 px-5 py-3 text-[12px]">
                  <span>Queue: {d.queue.waiting} waiting</span><span>{d.queue.active} running</span><span>{d.queue.completed} completed</span><span>{d.queue.failed} crashed</span>
                </div>
              )}
            </>
          )}
        </AsyncView>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Account">
          <div className="flex items-center gap-3">
            {user?.avatarUrl && <img src={user.avatarUrl} alt="" className="size-10 rounded-full" />}
            <div>
              <div className="font-medium">{user?.username || "—"}</div>
              <div className="muted text-[12px]">{user?.memberSince ? `Member since ${fullDate(user.memberSince)}` : "Signed in with GitHub"}</div>
            </div>
          </div>
        </Card>
        <Card title="Appearance">
          <div className="flex items-center justify-between">
            <span className="muted text-[13px]">Theme is saved in this browser.</span>
            <button className="btn" onClick={toggleTheme}>{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />} Switch to {theme === "dark" ? "light" : "dark"}</button>
          </div>
        </Card>
        <Card title="Connected repositories" className="md:col-span-2">
          <AsyncView state={status}>
            {(d) => (
              <div className="flex flex-wrap gap-2">
                {(d.connectedRepos || []).map((r) => <span key={r.fullName} className={`badge normal-case ${r.webhookStatus === "active" ? "badge-ok" : ""}`}>{r.fullName}{r.webhookStatus === "active" ? " · webhook active" : ""}</span>)}
                {!(d.connectedRepos || []).length && <span className="muted text-[13px]">None yet. Connect repositories on the Repositories page.</span>}
              </div>
            )}
          </AsyncView>
        </Card>
      </div>
    </>
  );
}

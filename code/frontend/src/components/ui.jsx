import { AlertCircle, ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";
import { human } from "../lib/format";

const TONES = {
  success: "ok", passed: "ok", merged: "accent", open: "info", completed: "ok",
  failed: "bad", failure: "bad", error: "bad", closed: "",
  queued: "warn", running: "warn", pending: "warn", skipped: "",
};

export function StatusBadge({ status, label }) {
  const tone = TONES[String(status || "").toLowerCase()] ?? "";
  const live = status === "running" || status === "queued";
  return (
    <span className={`badge ${tone ? `badge-${tone}` : ""}`}>
      <span className={`dot ${live ? "pulse" : ""}`} />
      {label || human(status) || "unknown"}
    </span>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="m-0 text-[22px] font-semibold tracking-tight">{title}</h1>
        {description && <p className="muted m-0 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h2 className="m-0 text-[14px] font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      <div className={pad ? "px-5 pb-5" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }) {
  return (
    <div className="card card-pad">
      <div className="muted text-[12px] font-medium">{label}</div>
      <div className="mt-2 text-[26px] font-semibold tracking-tight" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
      {hint && <div className="faint mt-1 text-[12px]">{hint}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…" }) {
  return (
    <div className="muted flex items-center justify-center gap-2 py-14">
      <LoaderCircle size={16} className="spin" /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <AlertCircle size={22} style={{ color: "var(--bad)" }} />
      <div className="max-w-md text-[13px]">{message}</div>
      {onRetry && (
        <button className="btn" onClick={onRetry}><RefreshCw size={14} /> Try again</button>
      )}
    </div>
  );
}

export function Empty({ icon: Icon, title, hint, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {Icon && <Icon size={22} className="faint" />}
      <div className="font-medium">{title}</div>
      {hint && <div className="muted max-w-md text-[13px]">{hint}</div>}
      {children}
    </div>
  );
}

/** Renders loading / error / empty / content for a useApi() result. */
export function AsyncView({ state, isEmpty, empty, children }) {
  if (state.loading) return <Loading />;
  if (state.error && state.data == null) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (isEmpty?.(state.data)) return empty;
  return children(state.data);
}

export function ExtLink({ href, children, className = "" }) {
  if (!href) return children || null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 hover:underline ${className}`} style={{ color: "var(--accent)" }}>
      {children} <ExternalLink size={12} />
    </a>
  );
}

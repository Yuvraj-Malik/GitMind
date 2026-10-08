const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const units = [
  ["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1],
];

export function timeAgo(value) {
  if (!value) return "—";
  const diff = (new Date(value).getTime() - Date.now()) / 1000;
  if (Number.isNaN(diff)) return "—";
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs || unit === "second") return rtf.format(Math.round(diff / secs), unit);
  }
  return "—";
}

export function fullDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function duration(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)} s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export function percent(x) {
  return x == null ? "—" : `${Math.round(x * 100)}%`;
}

export const human = (v) => String(v || "").replace(/_/g, " ");

export const isAiBranch = (b) => String(b || "").startsWith("ai/fix-");

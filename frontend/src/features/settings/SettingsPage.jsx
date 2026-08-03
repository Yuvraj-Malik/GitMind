import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { CheckCircle2, FolderGit2, LoaderCircle, Moon, Sun } from "lucide-react";
import Topbar from "../topbar/Topbar";
import useAppStore from "../../store/appStore";
import { fetchRepositories } from "../../services/dashboardService";

function SettingsPage() {
  const token = useAppStore((state) => state.token);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchRepositories()
      .then((data) => mounted && setRepositories(Array.isArray(data) ? data : []))
      .catch((requestError) => mounted && setError(requestError?.message || "Unable to reach the API."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <main className="workspace-shell flex min-h-[calc(100vh-32px)] flex-col">
      <Topbar />
      <section className="min-h-0 flex-1 overflow-auto p-8">
        <div className="mb-6 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-sky-400/40 bg-sky-500/10 text-sky-300"><FolderGit2 size={20} /></span><div><h1 className="m-0 text-xl font-semibold">Workspace settings</h1><p className="mt-1 text-sm text-slate-400">Your connected workspace and local display preference.</p></div></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <article className="grid gap-3 rounded-xl border border-slate-500/25 bg-slate-950/35 p-4">
            <div className="flex items-center justify-between gap-3"><h2 className="m-0 text-base font-semibold">GitHub connection</h2><span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-200"><CheckCircle2 size={12} className="mr-1" />Connected</span></div>
            <p className="m-0 text-sm text-slate-400">Your session is authenticated through GitHub. Repository access is populated from the backend.</p>
            <a className="w-fit text-sm text-sky-300 hover:text-sky-200" href="/repos">View connected repositories</a>
          </article>
          <article className="grid gap-3 rounded-xl border border-slate-500/25 bg-slate-950/35 p-4">
            <div className="flex items-center justify-between gap-3"><h2 className="m-0 text-base font-semibold">Appearance</h2>{theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}</div>
            <p className="m-0 text-sm text-slate-400">Choose the display mode for this browser. This preference is stored locally.</p>
            <button className="inline-flex w-fit items-center gap-2 rounded-lg border border-sky-400/45 bg-sky-950/35 px-3 py-2 text-sm text-sky-100" onClick={toggleTheme}>Use {theme === "dark" ? "light" : "dark"} mode</button>
          </article>
        </div>
        <section className="mt-7">
          <h2 className="mb-3 text-base font-semibold">Connected repositories</h2>
          {loading && <div className="rounded-xl border border-dashed border-slate-500/40 p-7 text-center text-slate-400"><LoaderCircle size={16} className="mr-2 inline animate-spin" /> Loading repository access…</div>}
          {error && <div className="rounded-xl border border-dashed border-rose-400/50 p-7 text-center text-rose-200">{error}</div>}
          {!loading && !error && !repositories.length && <div className="rounded-xl border border-dashed border-slate-500/40 p-7 text-center text-slate-400">No repositories have been connected yet.</div>}
          {!loading && !error && repositories.length > 0 && <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">{repositories.map((repository) => <article className="grid gap-3 rounded-xl border border-slate-500/25 bg-slate-950/35 p-4" key={repository._id || repository.id}><h2 className="m-0 text-base font-semibold">{repository.owner ? `${repository.owner}/` : ""}{repository.name}</h2><a className="w-fit text-sm text-sky-300 hover:text-sky-200" href={repository.url} target="_blank" rel="noreferrer">Open on GitHub</a></article>)}</div>}
        </section>
      </section>
    </main>
  );
}

export default SettingsPage;

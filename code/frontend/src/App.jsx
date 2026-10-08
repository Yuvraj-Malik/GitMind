import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import useStore from "./store";
import { useLiveEvents } from "./lib/hooks";
import Sidebar from "./layout/Sidebar";
import Topbar from "./layout/Topbar";
import LoginPage from "./pages/LoginPage";
import OverviewPage from "./pages/OverviewPage";
import AiFixesPage from "./pages/AiFixesPage";
import PullRequestsPage from "./pages/PullRequestsPage";
import BranchesPage from "./pages/BranchesPage";
import ActivityPage from "./pages/ActivityPage";
import SettingsPage from "./pages/SettingsPage";
import RepositoriesPage from "./pages/RepositoriesPage";

function Shell() {
  const token = useStore((s) => s.token);
  const loadUser = useStore((s) => s.loadUser);
  const loadRepos = useStore((s) => s.loadRepos);
  useLiveEvents(Boolean(token));
  useEffect(() => { if (token) { loadUser(); loadRepos(); } }, [token, loadUser, loadRepos]);
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-[1200px] px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Shell />}>
        <Route index element={<OverviewPage />} />
        <Route path="ai" element={<AiFixesPage />} />
        <Route path="pulls" element={<PullRequestsPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="repos" element={<RepositoriesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

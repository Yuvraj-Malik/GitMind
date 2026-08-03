import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./features/sidebar/Sidebar";
import DashboardPage from "./features/dashboard/DashboardPage";
import LoginPage from "./features/auth/LoginPage";
import SettingsPage from "./features/settings/SettingsPage";
import { ActivityPage, AiAgentsPage, BranchesPage, PullRequestsPage, RepositoriesPage } from "./features/workspace/WorkspacePages";

function App() {
  return (
    <div className="app-page">
      <Sidebar />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/branches" element={<BranchesPage />} />
        <Route path="/list" element={<PullRequestsPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/repos" element={<RepositoriesPage />} />
        <Route path="/ai" element={<AiAgentsPage />} />
        
        {/* Real Settings Page */}
        <Route path="/settings" element={<SettingsPage />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;

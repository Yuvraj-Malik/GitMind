import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./features/sidebar/Sidebar";
import DashboardPage from "./features/dashboard/DashboardPage";
import LoginPage from "./features/auth/LoginPage";
import SettingsPage from "./features/settings/SettingsPage";

function App() {
  return (
    <div className="app-page">
      <Sidebar />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Placeholder Routes for Sidebar */}
        <Route path="/branches" element={<PlaceholderPage title="Branches" icon="GitBranch" />} />
        <Route path="/list" element={<PlaceholderPage title="Pull Requests" icon="List" />} />
        <Route path="/activity" element={<PlaceholderPage title="Activity Feed" icon="Activity" />} />
        <Route path="/repos" element={<PlaceholderPage title="Repositories" icon="FolderGit2" />} />
        <Route path="/ai" element={<PlaceholderPage title="AI Agents" icon="Bot" />} />
        
        {/* Real Settings Page */}
        <Route path="/settings" element={<SettingsPage />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div className="workspace-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#94a3b8' }}>
      <h2>{title} Page (Coming Soon)</h2>
    </div>
  );
}

export default App;

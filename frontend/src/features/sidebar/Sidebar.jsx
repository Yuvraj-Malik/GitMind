import {
  Activity,
  Bot,
  FolderGit2,
  GitBranch,
  Home,
  List,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import useAppStore from "../../store/appStore";

function Sidebar() {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  const navItems = [
    { icon: Home, path: "/", title: "Dashboard" },
    { icon: GitBranch, path: "/branches", title: "Branches" },
    { icon: List, path: "/list", title: "Pull Requests" },
    { icon: Activity, path: "/activity", title: "Activity Feed" },
    { icon: FolderGit2, path: "/repos", title: "Repositories" },
    { icon: Bot, path: "/ai", title: "AI Agents" },
  ];

  return (
    <aside className="sidebar-rail">
      <div className="sidebar-stack" style={{ marginTop: '10px' }}>
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={index}
              to={item.path}
              title={item.title}
              className={({ isActive }) => `nav-dot ${isActive ? "active" : ""}`}
              aria-label={`nav-${index}`}
            >
              <Icon size={17} />
            </NavLink>
          );
        })}
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
        <button 
          className={`nav-dot theme-toggle ${theme}`} 
          onClick={toggleTheme} 
          title="Toggle Theme"
          style={{ cursor: "pointer", border: "none" }}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <NavLink 
          to="/settings" 
          title="Settings"
          className={({ isActive }) => `nav-dot ${isActive ? "active" : ""}`} 
        >
          <Settings size={17} />
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;

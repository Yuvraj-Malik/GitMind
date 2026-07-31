import {
  Activity,
  Bot,
  FolderGit2,
  GitBranch,
  Home,
  List,
  Settings,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

function Sidebar() {
  const navIcons = [Home, GitBranch, List, Activity, FolderGit2, Bot];
  const [activeIndex, setActiveIndex] = useState(1);

  return (
    <aside className="sidebar-rail">
      <div className="brand" style={{ fontSize: "0.9rem" }}>
        <Sparkles size={15} />
        <span style={{ display: "none" }}>Git-Mind</span>
      </div>

      <div className="sidebar-stack">
        {navIcons.map((Icon, index) => (
          <button
            key={index}
            className={`nav-dot ${index === activeIndex ? "active" : ""}`}
            type="button"
            aria-label={`nav-${index}`}
            onClick={() => setActiveIndex(index)}
          >
            <Icon size={17} />
          </button>
        ))}
      </div>

      <button className="nav-dot" type="button" style={{ marginTop: "auto" }}>
        <Settings size={17} />
      </button>
    </aside>
  );
}

export default Sidebar;
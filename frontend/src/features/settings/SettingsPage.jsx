import { useState } from "react";
import Topbar from "../topbar/Topbar";

function SettingsPage() {
  const [activeTab, setActiveTab] = useState("workspace");

  const tabs = [
    { id: "workspace", label: "Global Workspace" },
    { id: "vcs", label: "Version Control" },
    { id: "ai", label: "AI & Guardrails" },
    { id: "team", label: "Team Access" },
    { id: "notifications", label: "Notifications" },
  ];

  return (
    <main className="workspace-shell" style={{ overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <Topbar />
      
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Settings Sidebar */}
        <div style={{ width: "240px", borderRight: "1px solid rgba(131, 157, 207, 0.2)", padding: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "20px" }}>Settings</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  background: activeTab === tab.id ? "rgba(82, 183, 255, 0.15)" : "transparent",
                  color: activeTab === tab.id ? "#77c5ff" : "inherit",
                  fontWeight: activeTab === tab.id ? "bold" : "normal",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content Area */}
        <div style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
          {activeTab === "workspace" && <GlobalWorkspaceSettings />}
          {activeTab === "vcs" && <VersionControlSettings />}
          {activeTab === "ai" && <AIGuardrailsSettings />}
          {activeTab === "team" && <TeamAccessSettings />}
          {activeTab === "notifications" && <NotificationSettings />}
        </div>
      </div>
    </main>
  );
}

function GlobalWorkspaceSettings() {
  return (
    <div>
      <h3 style={{ fontSize: "1.4rem", marginBottom: "20px", borderBottom: "1px solid rgba(131, 157, 207, 0.2)", paddingBottom: "10px" }}>Global Workspace</h3>
      
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Workspace Name</label>
        <input type="text" defaultValue="Git-Mind Core" style={{ width: "100%", maxWidth: "400px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(131, 157, 207, 0.4)", background: "rgba(13, 20, 34, 0.75)", color: "inherit" }} />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Timezone</label>
        <select style={{ width: "100%", maxWidth: "400px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(131, 157, 207, 0.4)", background: "rgba(13, 20, 34, 0.75)", color: "inherit" }}>
          <option>UTC (Coordinated Universal Time)</option>
          <option>PST (Pacific Standard Time)</option>
          <option>EST (Eastern Standard Time)</option>
        </select>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Environment Variables (.env Vault)</label>
        <textarea rows={4} placeholder="DATABASE_URI=...\nTEST_SECRET=..." style={{ width: "100%", maxWidth: "600px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(131, 157, 207, 0.4)", background: "rgba(13, 20, 34, 0.75)", color: "inherit", fontFamily: "monospace" }} />
        <p style={{ fontSize: "0.8rem", color: "#8a9fc2", marginTop: "4px" }}>Securely injected into virtual builds during AI patch testing.</p>
      </div>

      <div style={{ marginTop: "40px", padding: "20px", border: "1px solid rgba(239, 92, 106, 0.4)", borderRadius: "8px", background: "rgba(239, 92, 106, 0.05)" }}>
        <h4 style={{ color: "#ef5c6a", margin: "0 0 10px 0" }}>Danger Zone</h4>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ padding: "8px 16px", background: "transparent", border: "1px solid #ef5c6a", color: "#ef5c6a", borderRadius: "6px", cursor: "pointer" }}>Disconnect GitHub</button>
          <button style={{ padding: "8px 16px", background: "#ef5c6a", border: "none", color: "white", borderRadius: "6px", cursor: "pointer" }}>Delete Workspace</button>
        </div>
      </div>
    </div>
  );
}

function VersionControlSettings() {
  return (
    <div>
      <h3 style={{ fontSize: "1.4rem", marginBottom: "20px", borderBottom: "1px solid rgba(131, 157, 207, 0.2)", paddingBottom: "10px" }}>Version Control & Repositories</h3>
      
      <div style={{ marginBottom: "30px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#4de0af" }}></div>
        <span style={{ fontWeight: "bold" }}>GitHub App Connected</span>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <h4 style={{ marginBottom: "12px" }}>Repository Whitelist</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(131, 157, 207, 0.2)" }}>
              <th style={{ padding: "10px 0" }}>Repository</th>
              <th>Monitor Commits</th>
              <th>Auto-Deploy AI Fixes</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid rgba(131, 157, 207, 0.1)" }}>
              <td style={{ padding: "12px 0" }}>Yuvraj-Malik/GitMind</td>
              <td><input type="checkbox" defaultChecked /></td>
              <td><input type="checkbox" defaultChecked /></td>
            </tr>
            <tr style={{ borderBottom: "1px solid rgba(131, 157, 207, 0.1)" }}>
              <td style={{ padding: "12px 0" }}>Yuvraj-Malik/frontend-app</td>
              <td><input type="checkbox" defaultChecked /></td>
              <td><input type="checkbox" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Branch Protection Rules</label>
        <input type="text" defaultValue="main, production, master" style={{ width: "100%", maxWidth: "400px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(131, 157, 207, 0.4)", background: "rgba(13, 20, 34, 0.75)", color: "inherit" }} />
        <p style={{ fontSize: "0.8rem", color: "#8a9fc2", marginTop: "4px" }}>AI will never open PRs directly against these branches. It will always use a staging branch.</p>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h4 style={{ marginBottom: "8px" }}>Webhook Health</h4>
        <div style={{ padding: "12px", background: "rgba(13, 20, 34, 0.75)", borderRadius: "8px", border: "1px solid rgba(131, 157, 207, 0.2)", fontSize: "0.85rem", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ color: "#4de0af" }}>[200 OK] pull_request event received - 2 mins ago</div>
          <div style={{ color: "#4de0af" }}>[200 OK] check_run event received - 1 hour ago</div>
          <div style={{ color: "#4de0af" }}>[200 OK] push event received - 3 hours ago</div>
        </div>
      </div>
    </div>
  );
}

function AIGuardrailsSettings() {
  return (
    <div>
      <h3 style={{ fontSize: "1.4rem", marginBottom: "20px", borderBottom: "1px solid rgba(131, 157, 207, 0.2)", paddingBottom: "10px" }}>AI Engine & Guardrails</h3>
      
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Provider Selection</label>
        <select style={{ width: "100%", maxWidth: "400px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(131, 157, 207, 0.4)", background: "rgba(13, 20, 34, 0.75)", color: "inherit" }}>
          <option>OpenAI (gpt-4o)</option>
          <option>Anthropic (claude-3.5-sonnet)</option>
          <option>Local / Custom Endpoint</option>
        </select>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>API Key Vault</label>
        <input type="password" defaultValue="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx" style={{ width: "100%", maxWidth: "400px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(131, 157, 207, 0.4)", background: "rgba(13, 20, 34, 0.75)", color: "inherit" }} />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Max Retry Loop</label>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <input type="range" min="1" max="5" defaultValue="3" style={{ width: "200px" }} />
          <span>3 Attempts</span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#8a9fc2", marginTop: "4px" }}>How many times AI can attempt to fix a broken build before escalating to human.</p>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Confidence Threshold (%)</label>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <input type="range" min="50" max="100" defaultValue="80" style={{ width: "200px" }} />
          <span>80%</span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#8a9fc2", marginTop: "4px" }}>If confidence &lt; 80%, AI only leaves a comment. If &gt; 80%, AI opens a PR.</p>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Context Window Limit (Files)</label>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <input type="range" min="1" max="20" defaultValue="5" style={{ width: "200px" }} />
          <span>Max 5 Files</span>
        </div>
      </div>
    </div>
  );
}

function TeamAccessSettings() {
  return (
    <div>
      <h3 style={{ fontSize: "1.4rem", marginBottom: "20px", borderBottom: "1px solid rgba(131, 157, 207, 0.2)", paddingBottom: "10px" }}>Team & Access Control</h3>
      
      <div style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h4 style={{ margin: 0 }}>Active Members</h4>
          <button style={{ padding: "6px 12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>+ Invite User</button>
        </div>
        
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(131, 157, 207, 0.2)" }}>
              <th style={{ padding: "10px 0" }}>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid rgba(131, 157, 207, 0.1)" }}>
              <td style={{ padding: "12px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#4de0af", display: "grid", placeItems: "center", color: "#000", fontWeight: "bold", fontSize: "0.8rem" }}>YM</div>
                Yuvraj Malik
              </td>
              <td>yuvraj@example.com</td>
              <td>
                <select defaultValue="Admin" style={{ padding: "4px", borderRadius: "4px", background: "transparent", border: "1px solid rgba(131, 157, 207, 0.4)", color: "inherit" }}>
                  <option>Admin</option>
                  <option>Lead Engineer</option>
                  <option>Developer</option>
                </select>
              </td>
              <td><button style={{ background: "transparent", border: "none", color: "#ef5c6a", cursor: "pointer" }}>Remove</button></td>
            </tr>
            <tr style={{ borderBottom: "1px solid rgba(131, 157, 207, 0.1)" }}>
              <td style={{ padding: "12px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#5d8ee8", display: "grid", placeItems: "center", color: "#fff", fontWeight: "bold", fontSize: "0.8rem" }}>JS</div>
                John Smith
              </td>
              <td>john@example.com</td>
              <td>
                <select defaultValue="Developer" style={{ padding: "4px", borderRadius: "4px", background: "transparent", border: "1px solid rgba(131, 157, 207, 0.4)", color: "inherit" }}>
                  <option>Admin</option>
                  <option>Lead Engineer</option>
                  <option>Developer</option>
                </select>
              </td>
              <td><button style={{ background: "transparent", border: "none", color: "#ef5c6a", cursor: "pointer" }}>Remove</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h4 style={{ marginBottom: "12px" }}>Pending Invites</h4>
        <div style={{ padding: "15px", border: "1px dashed rgba(131, 157, 207, 0.4)", borderRadius: "8px", color: "#8a9fc2", fontSize: "0.9rem" }}>
          No pending invites at the moment.
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div>
      <h3 style={{ fontSize: "1.4rem", marginBottom: "20px", borderBottom: "1px solid rgba(131, 157, 207, 0.2)", paddingBottom: "10px" }}>Notifications & Alerts</h3>
      
      <div style={{ marginBottom: "30px" }}>
        <h4 style={{ marginBottom: "12px" }}>Event Toggles</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="checkbox" defaultChecked /> Build Failed
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="checkbox" defaultChecked /> AI Opened PR
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="checkbox" defaultChecked /> AI Fix Failed (Max Retries Exceeded)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="checkbox" /> Security Vulnerability Detected
          </label>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Slack Webhook URL</label>
        <input type="url" placeholder="https://hooks.slack.com/services/..." style={{ width: "100%", maxWidth: "400px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(131, 157, 207, 0.4)", background: "rgba(13, 20, 34, 0.75)", color: "inherit" }} />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Discord Webhook URL</label>
        <input type="url" placeholder="https://discord.com/api/webhooks/..." style={{ width: "100%", maxWidth: "400px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(131, 157, 207, 0.4)", background: "rgba(13, 20, 34, 0.75)", color: "inherit" }} />
      </div>
    </div>
  );
}

export default SettingsPage;

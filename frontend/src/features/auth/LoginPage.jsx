import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Code2,
  GitBranch,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import useAppStore from "../../store/appStore";

const highlights = [
  "See pull requests, branches, and commits in one workspace.",
  "Let AI surface risks before they slow down a release.",
  "Keep your codebase context close to every decision.",
];

function GitHubMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.2-3.37-1.2-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.07 1.53 1.07.9 1.57 2.35 1.12 2.92.85.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.36 9.36 0 0 1 12 6.91c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.95-2.35 4.81-4.58 5.07.36.32.68.93.68 1.88 0 1.36-.01 2.45-.01 2.79 0 .27.18.59.69.49A10.23 10.23 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setToken = useAppStore((state) => state.setToken);
  const token = useAppStore((state) => state.token);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      navigate("/");
    } else if (token) {
      navigate("/");
    }
  }, [searchParams, navigate, setToken, token]);

  const handleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
    window.location.href = `${apiUrl.replace(/\/$/, "")}/auth/github`;
  };

  const handleDevBypass = () => {
    setToken("dev-bypass-token");
    navigate("/");
  };

  return (
    <main className="landing-page">
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />

      <nav className="landing-nav" aria-label="Main navigation">
        <div className="landing-brand">
          <span className="landing-brand-mark"><GitBranch size={19} strokeWidth={2.6} /></span>
          <span>GitMind</span>
        </div>
        <div className="landing-nav-status"><span /> Built for modern engineering teams</div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow"><Sparkles size={15} /> Your engineering command center</p>
          <h1>Build with context.<br /><em>Ship with confidence.</em></h1>
          <p className="landing-lede">
            GitMind turns your GitHub activity into a clear, intelligent workspace for every branch, pull request, and release.
          </p>

          <div className="landing-actions">
            <button className="github-action" onClick={handleLogin}>
              <GitHubMark />
              Continue with GitHub
              <ArrowRight size={18} className="action-arrow" />
            </button>
            <p>New here? Your GitHub account is all you need.</p>
          </div>

          <ul className="landing-highlights">
            {highlights.map((highlight) => (
              <li key={highlight}><CheckCircle2 size={17} /> {highlight}</li>
            ))}
          </ul>
        </div>

        <div className="landing-preview" aria-label="GitMind workspace preview">
          <div className="preview-glow" />
          <div className="preview-window">
            <div className="preview-topbar">
              <div className="preview-dots"><i /><i /><i /></div>
              <span><Network size={13} /> gitmind / workspace</span>
              <small>Live</small>
            </div>
            <div className="preview-content">
              <aside className="preview-sidebar">
                <span className="preview-logo"><GitBranch size={16} /></span>
                <i className="selected" /><i /><i /><i />
              </aside>
              <div className="preview-main">
                <div className="preview-heading"><div><b>Release overview</b><span>main / production</span></div><span className="preview-sync">● Synced</span></div>
                <div className="preview-metrics">
                  <div><span>Open PRs</span><b>12</b><small>+3 this week</small></div>
                  <div><span>Checks passing</span><b>96%</b><small className="positive">↑ 4.2%</small></div>
                  <div><span>AI insights</span><b>08</b><small>Ready to review</small></div>
                </div>
                <div className="preview-flow">
                  <div className="flow-title"><span>Recent delivery flow</span><small>This week</small></div>
                  <div className="flow-line" />
                  <div className="flow-node node-one"><Code2 size={14} /><span>feature/auth</span><small>2 commits</small></div>
                  <div className="flow-node node-two"><Bot size={14} /><span>AI review</span><small>3 insights</small></div>
                  <div className="flow-node node-three"><ShieldCheck size={14} /><span>Ready</span><small>All checks pass</small></div>
                </div>
              </div>
            </div>
          </div>
          <div className="preview-float-card"><Bot size={18} /><div><b>AI found 3 insights</b><span>Review your latest pull request</span></div><ArrowRight size={16} /></div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© 2026 GitMind</span>
        <button className="dev-bypass" onClick={handleDevBypass}>Developer? Enter demo workspace <ArrowRight size={14} /></button>
      </footer>
    </main>
  );
}

export default LoginPage;

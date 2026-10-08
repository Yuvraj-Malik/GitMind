import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GitBranch } from "lucide-react";
import useStore from "../store";
import { API_URL, api, errorMessage } from "../lib/api";

const ERRORS = {
  auth_failed: "GitHub sign-in failed. Please try again.",
  not_allowed: "This GitHub account isn't allowed to use this workspace.",
  session_expired: "Your session expired. Please sign in again.",
};

function GitHubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.2-3.37-1.2-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.07 1.53 1.07.9 1.57 2.35 1.12 2.92.85.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.36 9.36 0 0 1 12 6.91c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.95-2.35 4.81-4.58 5.07.36.32.68.93.68 1.88 0 1.36-.01 2.45-.01 2.79 0 .27.18.59.69.49A10.23 10.23 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { token, login } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(ERRORS[params.get("error")] || null);

  useEffect(() => {
    const t = params.get("token");
    if (t) { login(t); navigate("/", { replace: true }); }
    else if (token) navigate("/", { replace: true });
  }, [params, token, login, navigate]);

  const firebaseLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      const [{ signInWithPopup, GithubAuthProvider }, { auth, githubProvider }] = await Promise.all([import("firebase/auth"), import("../config/firebase")]);
      const result = await signInWithPopup(auth, githubProvider);
      const accessToken = GithubAuthProvider.credentialFromResult(result)?.accessToken;
      if (!accessToken) throw new Error("GitHub did not return an access token");
      const data = await api.loginWithGithubToken(accessToken, result.user.uid);
      login(data.token);
      navigate("/", { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid h-full place-items-center px-4">
      <div className="card w-full max-w-[380px] p-8 text-center">
        <span className="mx-auto mb-5 grid size-11 place-items-center rounded-xl text-white" style={{ background: "var(--accent)" }}>
          <GitBranch size={22} strokeWidth={2.4} />
        </span>
        <h1 className="m-0 text-[20px] font-semibold tracking-tight">Sign in to Git-Mind</h1>
        <p className="muted m-0 mt-2 mb-6 text-[13px] leading-6">AI that turns failing CI into verified pull requests, with a human approving every merge.</p>
        <button className="btn btn-primary h-10 w-full justify-center" onClick={() => window.location.assign(`${API_URL}/auth/github`)}>
          <GitHubMark /> Continue with GitHub
        </button>
        <button className="btn mt-2 h-10 w-full justify-center" onClick={firebaseLogin} disabled={busy}>
          {busy ? "Opening GitHub…" : "Continue with GitHub (Firebase popup)"}
        </button>
        {error && <p className="mt-4 mb-0 text-[13px]" style={{ color: "var(--bad)" }}>{error}</p>}
      </div>
    </div>
  );
}

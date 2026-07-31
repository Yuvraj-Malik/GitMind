import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAppStore from "../../store/appStore";

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
    window.location.href = "http://localhost:4000/auth/github";
  };

  const handleDevBypass = () => {
    setToken("dev-bypass-token");
    navigate("/");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#0f172a" }}>
      <div style={{ padding: "40px", backgroundColor: "#1e293b", borderRadius: "12px", textAlign: "center", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)" }}>
        <h1 style={{ color: "white", marginBottom: "20px" }}>Welcome to Git-Mind</h1>
        <p style={{ color: "#94a3b8", marginBottom: "30px" }}>Sign in to connect your GitHub repositories.</p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button 
            onClick={handleLogin}
            style={{ padding: "10px 20px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}
          >
            Sign in with GitHub
          </button>
          
          <button 
            onClick={handleDevBypass}
            style={{ padding: "10px 20px", backgroundColor: "transparent", color: "#94a3b8", border: "1px solid #475569", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}
          >
            Bypass for Development
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

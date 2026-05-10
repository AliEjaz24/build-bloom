import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import ibitLogo from "@/assets/ibitlogo.jpeg";

export const Route = createFileRoute("/login")({ component: LoginPage });

type Role = "student" | "teacher" | "admin";

function LoginPage() {
  const navigate = useNavigate();
  const { semester, setSemester } = useAuth();
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const emailValid = /^[^\s@]+@ibitpu\.edu\.pk$/i.test(email);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!emailValid) {
      const m = "Email must be a valid @ibitpu.edu.pk address.";
      setErr(m); toast.error(m); return;
    }
    logger.info("Login attempt", { email });
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      logger.error("Login failed", { email, error: error.message });
      const msg = /invalid login credentials/i.test(error.message)
        ? "Incorrect email or password. If you haven't registered, create an account first."
        : error.message;
      setErr(msg); toast.error(msg); return;
    }
    logger.info("Login successful", { email });
    toast.success("Signed in successfully");
    navigate({ to: "/app/dashboard" });
  };

  return (
    <div className="login-screen">
      <div className="login-grid-bg" />
      <div className="login-wrap">
        <div className="login-brand">
          <div className="login-brand-icon" style={{ overflow: "hidden", background: "white" }}>
            <img src={ibitLogo} alt="iBIT" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <div className="login-brand-name"><span>iBIT</span> TimeDesk</div>
            <div className="login-brand-sub">Executive Schedule Portal</div>
          </div>
        </div>

        <form className="login-card" onSubmit={submit}>
          <div className="login-heading">Department Portal</div>
          <div className="login-sub">Sign in with your university credentials</div>

          <div className="form-group">
            <label>University Email</label>
            <input className="form-input" type="email" placeholder="yourname@ibitpu.edu.pk"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
            {email && (
              <div className={`domain-hint ${emailValid ? "valid" : "invalid"}`}>
                {emailValid ? "✓ Valid university email" : "Must be a valid @ibitpu.edu.pk address"}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button className="btn-login" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
          {err && <div className="login-error">{err}</div>}

          <div className="login-link">
            New to the portal?{" "}
            <Link to="/signup" search={{ role }}>Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

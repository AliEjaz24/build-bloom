import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

type Role = "student" | "teacher" | "admin";

function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const emailValid = /^[^\s@]+@ibitpu\.edu\.pk$/i.test(email);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!emailValid) { setErr("Email must be a valid @ibitpu.edu.pk address."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    toast.success("Signed in");
    navigate({ to: "/app/dashboard" });
  };

  return (
    <div className="login-screen">
      <div className="login-grid-bg" />
      <div className="login-wrap">
        <div className="login-brand">
          <div className="login-brand-icon">iB</div>
          <div>
            <div className="login-brand-name"><span>iBIT</span> TimeDesk</div>
            <div className="login-brand-sub">Executive Schedule Portal</div>
          </div>
        </div>

        <form className="login-card" onSubmit={submit}>
          <div className="login-heading">Department Portal</div>
          <div className="login-sub">Sign in with your university credentials</div>

          <div className="role-tabs">
            {(["student", "teacher", "admin"] as Role[]).map((r) => (
              <button type="button" key={r} className={`role-tab ${role === r ? "active" : ""}`} onClick={() => setRole(r)}>
                {r[0].toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

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

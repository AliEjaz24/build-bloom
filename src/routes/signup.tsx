import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PROGRAMS, BATCHES, SECTIONS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import ibitLogo from "@/assets/ibitlogo.jpeg";

type Role = "student" | "teacher" | "admin";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>) => ({ role: ((s.role as Role) ?? "student") as Role }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { role: initialRole } = Route.useSearch();
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [program, setProgram] = useState("BBIT");
  const [batch, setBatch] = useState<number>(2024);
  const [section, setSection] = useState("A");
  const [department, setDepartment] = useState("Information Technology");
  const [designation, setDesignation] = useState("Lecturer");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const emailValid = /^[^\s@]+@ibitpu\.edu\.pk$/i.test(email);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!emailValid) { const m="Email must be a valid @ibitpu.edu.pk address."; setErr(m); toast.error(m); return; }
    if (password.length < 8) { const m="Password must be at least 8 characters."; setErr(m); toast.error(m); return; }
    setLoading(true);
    const meta: Record<string, string> = { full_name: fullName, role };
    if (role === "student") { meta.program = program; meta.batch = String(batch); meta.section = section; }
    if (role === "teacher" || role === "admin") { meta.department = department; meta.designation = designation; }
    logger.info("Signup attempt", { email, role });
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/app/dashboard`, data: meta },
    });
    setLoading(false);
    if (error) {
      logger.error("Signup failed", { email, error: error.message });
      const msg = /weak.*password|pwned/i.test(error.message)
        ? "This password has appeared in known data breaches. Please choose a stronger, unique password."
        : /already.*registered|user.*exists/i.test(error.message)
        ? "An account with this email already exists. Please sign in instead."
        : error.message;
      setErr(msg); toast.error(msg); return;
    }
    logger.info("Signup successful", { email, role });
    toast.success("Account created. Signing you in…");
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

        <form className="login-card" onSubmit={submit} style={{ width: "min(540px, 100%)" }}>
          <div className="login-heading">Create Account</div>
          <div className="login-sub">Register with your university credentials</div>

          <div className="role-tabs">
            {(["student", "teacher"] as Role[]).map((r) => (
              <button type="button" key={r} className={`role-tab ${role === r ? "active" : ""}`} onClick={() => setRole(r)}>
                {r[0].toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>University Email</label>
            <input className="form-input" type="email" placeholder="yourname@ibitpu.edu.pk"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
            {email && (
              <div className={`domain-hint ${emailValid ? "valid" : "invalid"}`}>
                {emailValid ? "✓ Valid university email" : "Must be a valid @ibitpu.edu.pk"}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input className="form-input" type="password" placeholder="At least 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>

          {role === "student" ? (
            <div className="form-row">
              <div className="form-col">
                <label>Program</label>
                <select className="form-input" value={program} onChange={(e) => setProgram(e.target.value)}>
                  {PROGRAMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="form-col">
                <label>Batch</label>
                <select className="form-input" value={batch} onChange={(e) => setBatch(Number(e.target.value))}>
                  {BATCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-col">
                <label>Section</label>
                <select className="form-input" value={section} onChange={(e) => setSection(e.target.value)}>
                  {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-col">
                <label>Department</label>
                <input className="form-input" value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div className="form-col">
                <label>Designation</label>
                <input className="form-input" value={designation} onChange={(e) => setDesignation(e.target.value)} />
              </div>
            </div>
          )}

          <button className="btn-login" disabled={loading}>{loading ? "Creating…" : "Create Account"}</button>
          {err && <div className="login-error">{err}</div>}

          <div className="login-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

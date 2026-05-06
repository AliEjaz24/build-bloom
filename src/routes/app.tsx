import { createFileRoute, Outlet, Link, useLocation, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

interface NavLink { to: string; label: string; icon: string; }

const NAV: Record<AppRole, { section: string; items: NavLink[] }[]> = {
  student: [
    { section: "Main", items: [
      { to: "/app/dashboard", label: "Dashboard", icon: "🏠" },
      { to: "/app/timetable", label: "My Timetable", icon: "📅" },
      { to: "/app/registration", label: "Course Registration", icon: "📝" },
    ]},
    { section: "Account", items: [
      { to: "/app/notifications", label: "Notifications", icon: "🔔" },
    ]},
  ],
  teacher: [
    { section: "Main", items: [
      { to: "/app/dashboard", label: "Dashboard", icon: "🏠" },
      { to: "/app/timetable", label: "My Schedule", icon: "📅" },
      { to: "/app/availability", label: "Availability", icon: "🕐" },
    ]},
    { section: "Requests", items: [
      { to: "/app/makeup", label: "Makeup Classes", icon: "🔄" },
      { to: "/app/cancel", label: "Cancel Class", icon: "❌" },
    ]},
    { section: "Account", items: [
      { to: "/app/notifications", label: "Notifications", icon: "🔔" },
    ]},
  ],
  admin: [
    { section: "Main", items: [
      { to: "/app/dashboard", label: "Dashboard", icon: "🏠" },
      { to: "/app/term-timetable", label: "Term Timetable", icon: "📊" },
    ]},
    { section: "Data", items: [
      { to: "/app/data", label: "Courses & Faculty", icon: "🗄" },
    ]},
    { section: "Requests", items: [
      { to: "/app/makeup", label: "Makeup Approvals", icon: "🔄" },
      { to: "/app/cancel", label: "Cancel Approvals", icon: "❌" },
    ]},
    { section: "Account", items: [
      { to: "/app/notifications", label: "Notifications", icon: "🔔" },
    ]},
  ],
};

function AppLayout() {
  const { profile, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!role) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">No role assigned. Contact admin.</div>;

  const nav = NAV[role];
  const initials = (profile?.full_name || profile?.email || "U").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const pageTitle = nav.flatMap(s => s.items).find(i => location.pathname.startsWith(i.to))?.label ?? "Dashboard";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">
          {collapsed ? "▶" : "◀"}
        </button>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">iB</div>
          <div>
            <div className="sidebar-logo-text"><span>iBIT</span> TimeDesk</div>
            <div className="sidebar-logo-sub">Schedule Portal</div>
          </div>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="user-name">{profile?.full_name || "User"}</div>
            <div className="user-role">{role}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map((sec) => (
            <div key={sec.section}>
              <div className="nav-section">{sec.section}</div>
              {sec.items.map((it) => (
                <Link key={it.to} to={it.to} className={`nav-item ${location.pathname.startsWith(it.to) ? "active" : ""}`}>
                  <span className="nav-icon">{it.icon}</span>
                  <span className="nav-label">{it.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn-logout" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
            <span className="logout-icon">⬅</span><span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="topbar-btn" onClick={() => setMobileOpen(true)} style={{ display: "none" }} id="mb-toggle">☰</button>
            <div className="page-title">{pageTitle}</div>
          </div>
          <div className="topbar-right">
            <span className="topbar-btn" style={{ pointerEvents: "none" }}>{profile?.email}</span>
          </div>
        </div>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

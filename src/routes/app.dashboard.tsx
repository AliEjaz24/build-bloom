import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { TIME_SLOTS, DAYS } from "@/lib/constants";

export const Route = createFileRoute("/app/dashboard")({ component: Dashboard });

interface Slot {
  id: string; day: number; slot_index: number; color: string | null;
  course_id: string | null; room_id: string | null; teacher_id: string | null;
  program: string; batch: number; section: string;
  courses?: { code: string; title: string; credit_hours: number } | null;
  rooms?: { code: string } | null;
  profiles?: { full_name: string } | null;
}

interface Notif { id: string; title: string; message: string | null; created_at: string; read: boolean }
interface MakeupRow { id: string; status: string; proposed_date: string | null; slot_index: number | null; created_at: string;
  courses?: { code: string; title: string } | null; profiles?: { full_name: string } | null }

function Dashboard() {
  const { profile, role } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [pendingMakeups, setPendingMakeups] = useState<MakeupRow[]>([]);
  const [stats, setStats] = useState({ courses: 0, ch: 0, classesToday: 0, pending: 0, students: 0, teachers: 0 });

  const today = (new Date().getDay() + 6) % 7;

  useEffect(() => {
    if (!role || !profile) return;
    (async () => {
      // notifications for everyone
      const { data: n } = await supabase
        .from("notifications").select("id,title,message,created_at,read")
        .order("created_at", { ascending: false }).limit(5);
      setNotifs((n as Notif[]) ?? []);

      if (role === "student" && profile.program && profile.batch && profile.section) {
        const { data } = await supabase
          .from("timetable_slots")
          .select("*, courses(code,title,credit_hours), rooms(code), profiles(full_name)")
          .eq("program", profile.program).eq("batch", profile.batch).eq("section", profile.section);
        setSlots((data as Slot[]) ?? []);
        const { data: regs } = await supabase
          .from("registrations").select("course_id, courses(credit_hours)").eq("student_id", profile.id);
        type Reg = { course_id: string; courses: { credit_hours: number } | null };
        const r = (regs as Reg[]) ?? [];
        const ch = r.reduce((a, x) => a + (x.courses?.credit_hours ?? 0), 0);
        const todayCount = (data as Slot[] ?? []).filter(s => s.day === today).length;
        setStats(s => ({ ...s, courses: r.length, ch, classesToday: todayCount }));
      } else if (role === "teacher") {
        const { data } = await supabase
          .from("timetable_slots")
          .select("*, courses(code,title,credit_hours), rooms(code), profiles(full_name)")
          .eq("teacher_id", profile.id);
        setSlots((data as Slot[]) ?? []);
        const { data: pm } = await supabase
          .from("makeup_requests")
          .select("id,status,proposed_date,slot_index,created_at,courses(code,title),profiles(full_name)")
          .eq("teacher_id", profile.id).eq("status", "pending")
          .order("created_at", { ascending: false }).limit(5);
        setPendingMakeups((pm as MakeupRow[]) ?? []);
        const todayCount = (data as Slot[] ?? []).filter(s => s.day === today).length;
        setStats(s => ({ ...s, courses: new Set((data as Slot[] ?? []).map(x => x.course_id)).size, classesToday: todayCount, pending: (pm ?? []).length }));
      } else {
        const [c, t, r, p, st, te] = await Promise.all([
          supabase.from("courses").select("id", { count: "exact", head: true }),
          supabase.from("timetable_slots").select("id", { count: "exact", head: true }),
          supabase.from("rooms").select("id", { count: "exact", head: true }),
          supabase.from("makeup_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "student"),
          supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "teacher"),
        ]);
        setStats({ courses: c.count ?? 0, ch: t.count ?? 0, classesToday: r.count ?? 0, pending: p.count ?? 0, students: st.count ?? 0, teachers: te.count ?? 0 });
        const { data: pm } = await supabase
          .from("makeup_requests")
          .select("id,status,proposed_date,slot_index,created_at,courses(code,title),profiles(full_name)")
          .eq("status", "pending").order("created_at", { ascending: false }).limit(5);
        setPendingMakeups((pm as MakeupRow[]) ?? []);
      }
    })();
  }, [role, profile, today]);

  const todaySlots = slots.filter(s => s.day === today).sort((a, b) => a.slot_index - b.slot_index);
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })();

  return (
    <>
      <div className="card" style={{ marginBottom: 18, background: "linear-gradient(135deg, var(--bg-card), var(--bg-panel))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--text-primary)" }}>
              {greeting}, {(profile?.full_name || "there").split(" ")[0]} 👋
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {" · "}<span style={{ textTransform: "capitalize" }}>{role}</span> view
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {profile?.department || profile?.program || ""}
            {profile?.section ? ` · Section ${profile.section}` : ""}
          </div>
        </div>
      </div>

      {role === "admin" && <AdminView stats={stats} pendingMakeups={pendingMakeups} notifs={notifs} />}
      {role === "teacher" && <TeacherView profile={profile} stats={stats} slots={slots} todaySlots={todaySlots} pendingMakeups={pendingMakeups} notifs={notifs} />}
      {role === "student" && <StudentView profile={profile} stats={stats} slots={slots} todaySlots={todaySlots} notifs={notifs} />}
    </>
  );
}

function AdminView({ stats, pendingMakeups, notifs }: { stats: { courses: number; ch: number; classesToday: number; pending: number; students: number; teachers: number }; pendingMakeups: MakeupRow[]; notifs: Notif[] }) {
  return (
    <>
      <div className="stats-grid">
        <Stat color="blue" label="Total Courses" value={stats.courses} sub="In catalog" />
        <Stat color="amber" label="Timetable Slots" value={stats.ch} sub="All sections" />
        <Stat color="teal" label="Rooms" value={stats.classesToday} sub="Available" />
        <Stat color="slate" label="Pending Approvals" value={stats.pending} sub="Awaiting review" />
      </div>
      <div className="stats-grid" style={{ marginTop: 4 }}>
        <Stat color="teal" label="Students" value={stats.students} sub="Registered" />
        <Stat color="amber" label="Teachers" value={stats.teachers} sub="Faculty" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }} className="dash-cols">
        <PendingMakeupsCard rows={pendingMakeups} forAdmin />
        <NotificationsCard items={notifs} />
      </div>

      <div className="feature-grid" style={{ marginTop: 18 }}>
        <FeatureLink to="/app/term-timetable" icon="📊" title="Term Timetable" desc="Build & publish weekly schedules" />
        <FeatureLink to="/app/data" icon="🗄" title="Courses & Faculty" desc="Manage courses, teachers, rooms" />
        <FeatureLink to="/app/makeup" icon="🔄" title="Makeup Approvals" desc="Review teacher makeup requests" />
        <FeatureLink to="/app/cancel" icon="❌" title="Cancellations" desc="Approve cancellation requests" />
      </div>
    </>
  );
}

function TeacherView({ profile, stats, slots, todaySlots, pendingMakeups, notifs }: { profile: { full_name: string; department: string | null; designation: string | null } | null; stats: { courses: number; classesToday: number; pending: number }; slots: Slot[]; todaySlots: Slot[]; pendingMakeups: MakeupRow[]; notifs: Notif[] }) {
  return (
    <>
      <div className="stats-grid">
        <Stat color="blue" label="Active Courses" value={stats.courses} sub="This semester" />
        <Stat color="teal" label="Classes Today" value={stats.classesToday} sub="On your schedule" />
        <Stat color="amber" label="Pending Makeups" value={stats.pending} sub="Awaiting approval" />
        <Stat color="slate" label="Department" value={profile?.department ?? "—"} sub={profile?.designation ?? ""} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }} className="dash-cols">
        <TodayScheduleCard todaySlots={todaySlots} />
        <PendingMakeupsCard rows={pendingMakeups} />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span>📅 My Weekly Schedule</span>
          <Link to="/app/timetable" className="view-link">View Full →</Link>
        </div>
        <ScheduleGrid slots={slots} />
      </div>

      <div style={{ marginTop: 18 }}><NotificationsCard items={notifs} /></div>

      <div className="feature-grid" style={{ marginTop: 18 }}>
        <FeatureLink to="/app/availability" icon="🕐" title="Availability" desc="Set when you're free for classes" />
        <FeatureLink to="/app/makeup" icon="🔄" title="Request Makeup" desc="Schedule a missed class" />
        <FeatureLink to="/app/cancel" icon="❌" title="Cancel a Class" desc="Notify students of cancellations" />
      </div>
    </>
  );
}

function StudentView({ profile, stats, slots, todaySlots, notifs }: { profile: { program: string | null; section: string | null; batch: number | null } | null; stats: { courses: number; ch: number; classesToday: number }; slots: Slot[]; todaySlots: Slot[]; notifs: Notif[] }) {
  const incomplete = !profile?.program || !profile?.section;
  return (
    <>
      <div className="stats-grid">
        <Stat color="blue" label="Credit Hours" value={stats.ch} sub="Max allowed: 21" />
        <Stat color="amber" label="Enrolled Courses" value={stats.courses} sub={`Program: ${profile?.program ?? "—"}`} />
        <Stat color="teal" label="Classes Today" value={stats.classesToday} sub="On your schedule" />
        <Stat color="slate" label="Section" value={profile?.section ?? "—"} sub={`Batch ${profile?.batch ?? "—"}`} />
      </div>

      {incomplete && (
        <div className="conflict-alert" style={{ marginTop: 14 }}>
          ⚠ Set your program, batch and section in your profile to see your timetable.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }} className="dash-cols">
        <TodayScheduleCard todaySlots={todaySlots} />
        <NotificationsCard items={notifs} />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span>📅 This Week's Timetable</span>
          <Link to="/app/timetable" className="view-link">View Full →</Link>
        </div>
        <ScheduleGrid slots={slots} />
      </div>

      <div className="feature-grid" style={{ marginTop: 18 }}>
        <FeatureLink to="/app/timetable" icon="📅" title="My Timetable" desc="View your personalized semester schedule" />
        <FeatureLink to="/app/registration" icon="📝" title="Course Registration" desc="Add or drop courses with conflict detection" />
        <FeatureLink to="/app/notifications" icon="🔔" title="Notifications" desc="Makeups, schedule changes & alerts" />
      </div>
    </>
  );
}

function TodayScheduleCard({ todaySlots }: { todaySlots: Slot[] }) {
  return (
    <div className="card">
      <div className="card-title">🗓 Today's Classes</div>
      {todaySlots.length === 0 ? (
        <EmptyState icon="🌤" text="No classes scheduled for today. Enjoy!" />
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {todaySlots.map(s => (
            <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: 8, background: "var(--bg-panel)" }}>
              <div style={{ minWidth: 70, fontSize: 12, fontWeight: 600, color: "var(--accent-c)" }}>{TIME_SLOTS[s.slot_index]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.courses?.code ?? "—"} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· {s.courses?.title ?? ""}</span></div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {s.rooms?.code ?? "TBA"}{s.profiles?.full_name ? ` · ${s.profiles.full_name}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PendingMakeupsCard({ rows, forAdmin }: { rows: MakeupRow[]; forAdmin?: boolean }) {
  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: "space-between" }}>
        <span>🔄 {forAdmin ? "Pending Makeup Requests" : "Your Pending Makeups"}</span>
        <Link to="/app/makeup" className="view-link">View All →</Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="✅" text="Nothing pending right now." />
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map(r => (
            <li key={r.id} style={{ padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.courses?.code ?? "—"} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· {r.courses?.title ?? ""}</span></div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(194,138,42,.15)", color: "var(--accent2)", textTransform: "uppercase" }}>Pending</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {forAdmin && r.profiles?.full_name ? `${r.profiles.full_name} · ` : ""}
                Proposed: {r.proposed_date ?? "—"}{r.slot_index != null ? ` · ${TIME_SLOTS[r.slot_index]}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationsCard({ items }: { items: Notif[] }) {
  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: "space-between" }}>
        <span>🔔 Recent Notifications</span>
        <Link to="/app/notifications" className="view-link">View All →</Link>
      </div>
      {items.length === 0 ? (
        <EmptyState icon="📭" text="No notifications yet." />
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(n => (
            <li key={n.id} style={{ padding: "10px 12px", border: "1px solid var(--border-light)", borderRadius: 8, background: n.read ? "transparent" : "var(--bg-panel)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(n.created_at).toLocaleDateString()}</div>
              </div>
              {n.message && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{n.message}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-muted)" }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 12 }}>{text}</div>
    </div>
  );
}

function Stat({ color, label, value, sub }: { color: string; label: string; value: number | string; sub: string }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function FeatureLink({ to, icon, title, desc }: { to: string; icon: string; title: string; desc: string }) {
  return (
    <Link to={to} className="feature-card">
      <div className="feature-icon">{icon}</div>
      <div className="feature-title">{title}</div>
      <div className="feature-desc">{desc}</div>
    </Link>
  );
}

export function ScheduleGrid({ slots }: { slots: Slot[] }) {
  return (
    <div className="schedule-wrapper">
      <div className="schedule-grid">
        <div className="sg-header">TIME</div>
        {DAYS.map(d => <div key={d} className="sg-header">{d}</div>)}
        {TIME_SLOTS.map((t, si) => (
          <div key={`row-${si}`} style={{ display: "contents" }}>
            <div className="sg-time">{t}</div>
            {DAYS.map((_, di) => {
              const s = slots.find(x => x.day === di && x.slot_index === si);
              return (
                <div key={`c-${si}-${di}`} className="sg-cell">
                  {s && (
                    <div className={`sg-class ${s.color ?? ""}`}>
                      <div className="sg-class-name">{s.courses?.code ?? "—"}</div>
                      <div className="sg-class-room">{s.rooms?.code ?? ""}{s.profiles?.full_name ? ` · ${s.profiles.full_name}` : ""}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

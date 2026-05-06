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

function Dashboard() {
  const { profile, role } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [stats, setStats] = useState({ courses: 0, ch: 0, classesToday: 0, pending: 0 });

  useEffect(() => {
    if (!role || !profile) return;
    (async () => {
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
        const today = (new Date().getDay() + 6) % 7;
        const todayCount = (data as Slot[] ?? []).filter(s => s.day === today).length;
        setStats({ courses: r.length, ch, classesToday: todayCount, pending: 0 });
      } else if (role === "teacher") {
        const { data } = await supabase
          .from("timetable_slots")
          .select("*, courses(code,title,credit_hours), rooms(code), profiles(full_name)")
          .eq("teacher_id", profile.id);
        setSlots((data as Slot[]) ?? []);
        const { data: pending } = await supabase
          .from("makeup_requests").select("id", { count: "exact", head: true }).eq("teacher_id", profile.id).eq("status", "pending");
        const today = (new Date().getDay() + 6) % 7;
        const todayCount = (data as Slot[] ?? []).filter(s => s.day === today).length;
        setStats({ courses: new Set((data as Slot[] ?? []).map(s => s.course_id)).size, ch: 0, classesToday: todayCount, pending: pending?.length ?? 0 });
      } else {
        const [c, t, r, p] = await Promise.all([
          supabase.from("courses").select("id", { count: "exact", head: true }),
          supabase.from("timetable_slots").select("id", { count: "exact", head: true }),
          supabase.from("rooms").select("id", { count: "exact", head: true }),
          supabase.from("makeup_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);
        setStats({ courses: c.count ?? 0, ch: t.count ?? 0, classesToday: r.count ?? 0, pending: p.count ?? 0 });
      }
    })();
  }, [role, profile]);

  if (role === "admin") {
    return (
      <>
        <div className="stats-grid">
          <Stat color="blue" label="Total Courses" value={stats.courses} sub="In catalog" />
          <Stat color="amber" label="Timetable Slots" value={stats.ch} sub="All sections" />
          <Stat color="teal" label="Rooms" value={stats.classesToday} sub="Available" />
          <Stat color="slate" label="Pending Requests" value={stats.pending} sub="Awaiting review" />
        </div>
        <div className="feature-grid">
          <FeatureLink to="/app/term-timetable" icon="📊" title="Term Timetable" desc="Build & publish weekly schedules" />
          <FeatureLink to="/app/data" icon="🗄" title="Courses & Faculty" desc="Manage courses, teachers, rooms" />
          <FeatureLink to="/app/makeup" icon="🔄" title="Makeup Approvals" desc="Review teacher makeup requests" />
          <FeatureLink to="/app/cancel" icon="❌" title="Cancellations" desc="Approve cancellation requests" />
        </div>
      </>
    );
  }

  if (role === "teacher") {
    return (
      <>
        <div className="stats-grid">
          <Stat color="blue" label="Active Courses" value={stats.courses} sub="This semester" />
          <Stat color="teal" label="Classes Today" value={stats.classesToday} sub="On your schedule" />
          <Stat color="amber" label="Pending Makeups" value={stats.pending} sub="Awaiting approval" />
          <Stat color="slate" label="Department" value={profile?.department ?? "—"} sub={profile?.designation ?? ""} />
        </div>
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-title">📅 My Weekly Schedule</div>
          <ScheduleGrid slots={slots} />
        </div>
        <div className="feature-grid">
          <FeatureLink to="/app/availability" icon="🕐" title="Availability" desc="Set when you're free for classes" />
          <FeatureLink to="/app/makeup" icon="🔄" title="Request Makeup" desc="Schedule a missed class" />
          <FeatureLink to="/app/cancel" icon="❌" title="Cancel a Class" desc="Notify students of cancellations" />
        </div>
      </>
    );
  }

  // Student
  return (
    <>
      <div className="stats-grid">
        <Stat color="blue" label="Credit Hours" value={stats.ch} sub="Max allowed: 21" />
        <Stat color="amber" label="Enrolled Courses" value={stats.courses} sub={`Program: ${profile?.program ?? "—"}`} />
        <Stat color="teal" label="Classes Today" value={stats.classesToday} sub="On your schedule" />
        <Stat color="slate" label="Section" value={profile?.section ?? "—"} sub={`Batch ${profile?.batch ?? "—"}`} />
      </div>

      {(!profile?.program || !profile?.section) && (
        <div className="conflict-alert">⚠ Set your program, batch and section in your profile to see your timetable.</div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span>📅 This Week's Timetable</span>
          <Link to="/app/timetable" className="view-link">View Full →</Link>
        </div>
        <ScheduleGrid slots={slots} />
        <div className="quick-btns">
          <Link to="/app/timetable" className="btn btn-outline">📋 Full Timetable</Link>
          <Link to="/app/registration" className="btn btn-accent">➕ Add/Drop Courses</Link>
          <div className="credit-cards">
            <div className="credit-card"><div className="cc-label">Enrolled CH</div><div className="cc-value">{stats.ch}</div></div>
            <div className="credit-card"><div className="cc-label">Max CH</div><div className="cc-value">21</div></div>
          </div>
        </div>
      </div>

      <div className="feature-grid">
        <FeatureLink to="/app/timetable" icon="📅" title="My Timetable" desc="View your personalized semester schedule" />
        <FeatureLink to="/app/registration" icon="📝" title="Course Registration" desc="Add or drop courses with conflict detection" />
        <FeatureLink to="/app/notifications" icon="🔔" title="Notifications" desc="Makeups, schedule changes & alerts" />
      </div>
    </>
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
          <>
            <div key={`t-${si}`} className="sg-time">{t}</div>
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
          </>
        ))}
      </div>
    </div>
  );
}

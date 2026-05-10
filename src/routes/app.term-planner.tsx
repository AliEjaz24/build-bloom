import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { TIME_SLOTS, SECTIONS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/app/term-planner")({ component: TermPlanner });

interface Term { id: string; code: string; label: string; }
interface Course { id: string; code: string; title: string; credit_hours: number; }
interface Room { id: string; code: string; }
interface Teacher { id: string; full_name: string; }
interface TermCourse { id: string; term_id: string; course_id: string; teacher_id: string | null; room_id: string | null; section: string | null;
  courses?: { code: string; title: string; credit_hours: number } | null;
  profiles?: { full_name: string } | null;
  rooms?: { code: string } | null;
}
interface DateRow { id: string; term_id: string; kind: string; course_id: string | null; exam_date: string | null; slot_index: number | null; room_id: string | null;
  courses?: { code: string; title: string } | null; rooms?: { code: string } | null;
}
interface WeekRow { id?: string; term_id?: string; week: number; day: number; label: string; color: string | null; }

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const LABEL_PRESETS = [
  { label: "Regular Classes", color: "green" },
  { label: "Midterm Week", color: "red" },
  { label: "Prep Week", color: "amber" },
  { label: "Final Exams", color: "red" },
  { label: "Holiday", color: "slate" },
  { label: "No Class", color: "slate" },
];

type Tab = "courses" | "midterm" | "final" | "weeks";

function TermPlanner() {
  const { role, profile, semester } = useAuth();
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("courses");

  useEffect(() => {
    supabase.from("terms").select("id,code,label").order("code").then(({ data }) => {
      let t = (data as Term[]) ?? [];
      if (role === "student" && profile?.batch) {
        const batchStr = profile.batch.toString().slice(-2);
        // Filter by batch AND semester
        t = t.filter(x => 
          (x.label.includes(batchStr) || x.code.includes(batchStr)) &&
          (x.label.toLowerCase().includes(semester.toLowerCase()) || x.code.toLowerCase().includes(semester.toLowerCase()))
        );
      }
      setTerms(t);
      if (t.length && (!termId || !t.find(x => x.id === termId))) setTermId(t[0].id);
    });
    // eslint-disable-next-line
  }, [role, profile?.id, profile?.batch, semester]);

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">📅 Select Term</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {terms.map(t => (
            <button key={t.id}
              onClick={() => setTermId(t.id)}
              className="btn"
              style={{
                background: t.id === termId ? "var(--accent)" : "var(--bg-panel)",
                color: t.id === termId ? "#fff" : "var(--text-primary)",
                border: "1px solid var(--border-light)", padding: "14px", fontWeight: 600,
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {([
          ["courses", "Courses Offered"],
          ["midterm", "Midterm Datesheet"],
          ["final", "Final Datesheet"],
          ["weeks", "16-Week Planner"],
        ] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="btn"
            style={{
              background: tab === k ? "var(--accent)" : "var(--bg-card)",
              color: tab === k ? "#fff" : "var(--text-primary)",
              border: "1px solid var(--border-light)", fontWeight: 600,
            }}>{l}</button>
        ))}
      </div>

      {!termId && <div className="card">Select a term above.</div>}
      {termId && tab === "courses" && <CoursesTab termId={termId} isAdmin={role === "admin"} />}
      {termId && tab === "midterm" && <DatesheetTab termId={termId} kind="midterm" isAdmin={role === "admin"} />}
      {termId && tab === "final" && <DatesheetTab termId={termId} kind="final" isAdmin={role === "admin"} />}
      {termId && tab === "weeks" && <WeeksTab termId={termId} isAdmin={role === "admin"} />}
    </>
  );
}

function CoursesTab({ termId, isAdmin }: { termId: string; isAdmin: boolean }) {
  const [rows, setRows] = useState<TermCourse[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState({ course_id: "", teacher_id: "", room_id: "", section: "A" });

  const load = async () => {
    const { data } = await supabase.from("term_courses")
      .select("*, courses(code,title,credit_hours), profiles(full_name), rooms(code)")
      .eq("term_id", termId);
    setRows((data as TermCourse[]) ?? []);
    const [{ data: c }, { data: r }, { data: roleData }] = await Promise.all([
      supabase.from("courses").select("id,code,title,credit_hours").order("code"),
      supabase.from("rooms").select("id,code").order("code"),
      supabase.from("user_roles").select("user_id").eq("role", "teacher"),
    ]);
    setCourses((c as Course[]) ?? []);
    setRooms((r as Room[]) ?? []);
    
    const tIds = (roleData || []).map(x => x.user_id);
    if (tIds.length > 0) {
      const { data: ts } = await supabase.from("profiles").select("id,full_name").in("id", tIds);
      setTeachers((ts as Teacher[]) ?? []);
    } else {
      setTeachers([]);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [termId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.some(r => r.course_id === form.course_id && r.section === form.section)) {
      toast.error("This course is already offered for this section.");
      return;
    }
    const { error } = await supabase.from("term_courses").insert({
      term_id: termId, course_id: form.course_id,
      teacher_id: form.teacher_id || null, room_id: form.room_id || null, section: form.section,
    });
    if (error) toast.error(error.message); else { toast.success("Added"); setForm({ course_id: "", teacher_id: "", room_id: "", section: "A" }); load(); }
  };
  const del = async (id: string) => { await supabase.from("term_courses").delete().eq("id", id); load(); };

  return (
    <>
      {isAdmin && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">➕ Offer a Course</div>
          <form onSubmit={add}>
            <div className="form-row">
              <div className="form-col"><label>Course</label>
                <select className="form-input" required value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
                </select>
              </div>
              <div className="form-col"><label>Teacher</label>
                <select className="form-input" value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })}>
                  <option value="">—</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="form-col"><label>Room</label>
                <select className="form-input" value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}>
                  <option value="">—</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.code}</option>)}
                </select>
              </div>
              <div className="form-col"><label>Section</label>
                <select className="form-input" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-accent" style={{ marginTop: 12 }}>Add</button>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-title" style={{ padding: "20px 20px 12px" }}>📚 Courses Offered</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ background: "var(--bg-panel)" }}>
              <tr>
                {["Course Code", "Course Title", "Credit Hours", "Teacher", "Room", "Section", isAdmin ? "" : null].filter(Boolean).map((h, i) => (
                  <th key={i} style={{ padding: "12px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={isAdmin ? 7 : 6} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No courses offered yet.</td></tr>}
              {rows.map(r => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>{r.courses?.code ?? "—"}</td>
                  <td style={{ padding: "12px 14px" }}>{r.courses?.title ?? ""}</td>
                  <td style={{ padding: "12px 14px" }}>{r.courses?.credit_hours ?? "—"}</td>
                  <td style={{ padding: "12px 14px" }}>{r.profiles?.full_name ?? "—"}</td>
                  <td style={{ padding: "12px 14px" }}>{r.rooms?.code ?? "—"}</td>
                  <td style={{ padding: "12px 14px" }}>{r.section ?? "—"}</td>
                  {isAdmin && <td style={{ padding: "12px 14px" }}><button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function DatesheetTab({ termId, kind, isAdmin }: { termId: string; kind: "midterm" | "final"; isAdmin: boolean }) {
  const [rows, setRows] = useState<DateRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState({ course_id: "", exam_date: "", slot_index: 0, room_id: "" });

  const load = async () => {
    const { data } = await supabase.from("term_datesheet")
      .select("*, courses(code,title), rooms(code)")
      .eq("term_id", termId).eq("kind", kind).order("exam_date");
    setRows((data as DateRow[]) ?? []);
    const [{ data: tc }, { data: r }] = await Promise.all([
      supabase.from("term_courses").select("course_id, courses(id,code,title,credit_hours)").eq("term_id", termId),
      supabase.from("rooms").select("id,code").order("code"),
    ]);
    
    const uniqueCoursesMap = new Map();
    (tc || []).forEach((x: any) => {
      if (x.courses && !uniqueCoursesMap.has(x.courses.id)) {
        uniqueCoursesMap.set(x.courses.id, x.courses);
      }
    });
    
    setCourses(Array.from(uniqueCoursesMap.values()) as Course[]);
    setRooms((r as Room[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [termId, kind]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("term_datesheet").insert({
      term_id: termId, kind, course_id: form.course_id || null,
      exam_date: form.exam_date || null, slot_index: form.slot_index, room_id: form.room_id || null,
    });
    if (error) toast.error(error.message); else { setForm({ course_id: "", exam_date: "", slot_index: 0, room_id: "" }); load(); }
  };
  const del = async (id: string) => { await supabase.from("term_datesheet").delete().eq("id", id); load(); };

  return (
    <>
      {isAdmin && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">➕ Add {kind === "midterm" ? "Midterm" : "Final"} Exam</div>
          <form onSubmit={add}>
            <div className="form-row">
              <div className="form-col"><label>Course</label>
                <select className="form-input" required value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
                </select>
              </div>
              <div className="form-col"><label>Date</label>
                <input type="date" className="form-input" required value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })} />
              </div>
              <div className="form-col"><label>Time Slot</label>
                <select className="form-input" value={form.slot_index} onChange={e => setForm({ ...form, slot_index: Number(e.target.value) })}>
                  {TIME_SLOTS.map((t, i) => <option key={i} value={i}>{t}</option>)}
                </select>
              </div>
              <div className="form-col"><label>Room</label>
                <select className="form-input" value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}>
                  <option value="">—</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.code}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-accent" style={{ marginTop: 12 }}>Add</button>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-title" style={{ padding: "20px 20px 12px" }}>
          📝 {kind === "midterm" ? "Midterm" : "Final"} Datesheet
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ background: "var(--bg-panel)" }}>
              <tr>{["Date", "Time", "Course", "Title", "Room", isAdmin ? "" : null].filter(Boolean).map((h, i) =>
                <th key={i} style={{ padding: "12px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No exams scheduled.</td></tr>}
              {rows.map(r => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "12px 14px" }}>{r.exam_date}</td>
                  <td style={{ padding: "12px 14px" }}>{r.slot_index !== null ? TIME_SLOTS[r.slot_index] : "—"}</td>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>{r.courses?.code ?? "—"}</td>
                  <td style={{ padding: "12px 14px" }}>{r.courses?.title ?? ""}</td>
                  <td style={{ padding: "12px 14px" }}>{r.rooms?.code ?? "—"}</td>
                  {isAdmin && <td style={{ padding: "12px 14px" }}><button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function WeeksTab({ termId, isAdmin }: { termId: string; isAdmin: boolean }) {
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [editing, setEditing] = useState<{ week: number; day: number; existing?: WeekRow } | null>(null);
  const [form, setForm] = useState({ label: "Regular Classes", color: "green" });

  const load = async () => {
    const { data } = await supabase.from("term_week_plan").select("*").eq("term_id", termId);
    setRows((data as WeekRow[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [termId]);

  const open = (week: number, day: number) => {
    if (!isAdmin) return;
    const existing = rows.find(r => r.week === week && r.day === day);
    setEditing({ week, day, existing });
    setForm({ label: existing?.label ?? "Regular Classes", color: existing?.color ?? "green" });
  };
  const save = async () => {
    if (!editing) return;
    const payload = { term_id: termId, week: editing.week, day: editing.day, label: form.label, color: form.color };
    const { error } = editing.existing?.id
      ? await supabase.from("term_week_plan").update(payload).eq("id", editing.existing.id)
      : await supabase.from("term_week_plan").insert(payload);
    if (error) toast.error(error.message); else { setEditing(null); load(); }
  };
  const del = async () => {
    if (editing?.existing?.id) { await supabase.from("term_week_plan").delete().eq("id", editing.existing.id); setEditing(null); load(); }
  };

  const colorBg = (c: string | null) => {
    switch (c) {
      case "red": return { bg: "#fde2e2", fg: "#9b1c1c" };
      case "amber": return { bg: "#fef3c7", fg: "#92400e" };
      case "slate": return { bg: "#e2e8f0", fg: "#334155" };
      default: return { bg: "#d1fae5", fg: "#065f46" };
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="card-title" style={{ padding: "20px 20px 12px", justifyContent: "space-between" }}>
        <span>🗓 16-Week Semester Planner</span>
        {isAdmin && <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>Click any cell to edit</span>}
      </div>
      <div style={{ overflowX: "auto", padding: "0 20px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "100px repeat(5, minmax(140px, 1fr))", gap: 1, background: "var(--border-light)", border: "1px solid var(--border-light)" }}>
          <div style={{ background: "var(--text-primary)", color: "#fff", padding: 14, fontWeight: 700, textAlign: "center" }}>Week</div>
          {WEEK_DAYS.map(d => <div key={d} style={{ background: "var(--text-primary)", color: "#fff", padding: 14, fontWeight: 700, textAlign: "center" }}>{d}</div>)}
          {Array.from({ length: 16 }, (_, w) => w + 1).map(week => (
            <div key={week} style={{ display: "contents" }}>
              <div style={{ background: "var(--text-primary)", color: "#fff", padding: 14, fontWeight: 600, textAlign: "center" }}>Week {week}</div>
              {WEEK_DAYS.map((_, day) => {
                const r = rows.find(x => x.week === week && x.day === day);
                const c = colorBg(r?.color ?? "green");
                return (
                  <div key={day} onClick={() => open(week, day)}
                    style={{ background: "#fff", padding: 12, minHeight: 60, cursor: isAdmin ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ background: c.bg, color: c.fg, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
                      {r?.label ?? "Regular Classes"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setEditing(null)}>
          <div className="card" style={{ width: "min(420px, 95%)" }} onClick={e => e.stopPropagation()}>
            <div className="card-title">Week {editing.week} — {WEEK_DAYS[editing.day]}</div>
            <div className="form-col"><label>Label</label>
              <select className="form-input" value={form.label}
                onChange={e => {
                  const preset = LABEL_PRESETS.find(p => p.label === e.target.value);
                  setForm({ label: e.target.value, color: preset?.color ?? form.color });
                }}>
                {LABEL_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-col" style={{ marginTop: 10 }}><label>Color</label>
              <select className="form-input" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}>
                <option value="green">Green</option>
                <option value="red">Red</option>
                <option value="amber">Amber</option>
                <option value="slate">Slate</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              {editing.existing?.id && <button className="btn btn-danger" onClick={del}>Clear</button>}
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-accent" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

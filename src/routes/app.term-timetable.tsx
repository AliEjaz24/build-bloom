import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { TIME_SLOTS, DAYS, PROGRAMS, BATCHES, SECTIONS, COLOR_OPTIONS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/app/term-timetable")({ component: TermPage });

interface Slot {
  id: string; day: number; slot_index: number; color: string | null;
  course_id: string | null; room_id: string | null; teacher_id: string | null;
  courses?: { code: string } | null; rooms?: { code: string } | null; profiles?: { full_name: string } | null;
}

function TermPage() {
  const { role } = useAuth();
  const [program, setProgram] = useState("BBIT");
  const [batch, setBatch] = useState(2024);
  const [section, setSection] = useState("A");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [courses, setCourses] = useState<{ id: string; code: string; title: string }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; code: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([]);
  const [editing, setEditing] = useState<{ day: number; slot_index: number; existing?: Slot } | null>(null);
  const [form, setForm] = useState({ course_id: "", room_id: "", teacher_id: "", color: "teal" });

  const load = async () => {
    const { data } = await supabase.from("timetable_slots")
      .select("*, courses(code), rooms(code), profiles(full_name)")
      .eq("program", program).eq("batch", batch).eq("section", section);
    setSlots((data as Slot[]) ?? []);
    const [{ data: c }, { data: r }, { data: t }] = await Promise.all([
      supabase.from("courses").select("id,code,title").order("code"),
      supabase.from("rooms").select("id,code").order("code"),
      supabase.from("user_roles").select("profiles!inner(id,full_name)").eq("role", "teacher"),
    ]);
    setCourses(c ?? []);
    setRooms(r ?? []);
    type TR = { profiles: { id: string; full_name: string } };
    setTeachers(((t as unknown as TR[]) ?? []).map(x => x.profiles));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [program, batch, section]);

  if (role !== "admin") return <div className="card">Admin only.</div>;

  const openCell = (day: number, slot_index: number) => {
    const existing = slots.find(s => s.day === day && s.slot_index === slot_index);
    setEditing({ day, slot_index, existing });
    setForm({
      course_id: existing?.course_id ?? "",
      room_id: existing?.room_id ?? "",
      teacher_id: existing?.teacher_id ?? "",
      color: existing?.color ?? "teal",
    });
  };
  const save = async () => {
    if (!editing) return;
    if (form.room_id) {
      const conflict = slots.find(s => s.day === editing.day && s.slot_index === editing.slot_index && s.room_id === form.room_id && s.id !== editing.existing?.id);
      if (conflict) { toast.error(`Room already booked at this time (${conflict.courses?.code ?? "another class"})`); return; }
    }
    if (form.teacher_id) {
      const { data: tConf } = await supabase.from("timetable_slots").select("id, courses(code)")
        .eq("day", editing.day).eq("slot_index", editing.slot_index).eq("teacher_id", form.teacher_id);
      const other = (tConf ?? []).find(x => x.id !== editing.existing?.id);
      if (other) { toast.error(`Teacher already booked at this time`); return; }
    }
    const payload = {
      program, batch, section,
      day: editing.day, slot_index: editing.slot_index,
      course_id: form.course_id || null, room_id: form.room_id || null, teacher_id: form.teacher_id || null,
      color: form.color,
    };
    const { error } = editing.existing
      ? await supabase.from("timetable_slots").update(payload).eq("id", editing.existing.id)
      : await supabase.from("timetable_slots").insert(payload);
    if (error) {
      const msg = error.code === "23505" ? "Conflict: room or teacher already booked at this time." : error.message;
      toast.error(msg);
    } else { toast.success("Saved"); setEditing(null); load(); }
  };
  const remove = async () => {
    if (editing?.existing) {
      await supabase.from("timetable_slots").delete().eq("id", editing.existing.id);
      setEditing(null); load();
    }
  };

  return (
    <>
      <div className="timetable-controls">
        <select className="select-input" value={program} onChange={e => setProgram(e.target.value)}>
          {PROGRAMS.map(p => <option key={p.value} value={p.value}>{p.value}</option>)}
        </select>
        <select className="select-input" value={batch} onChange={e => setBatch(Number(e.target.value))}>
          {BATCHES.map(b => <option key={b} value={b}>Batch {b}</option>)}
        </select>
        <select className="select-input" value={section} onChange={e => setSection(e.target.value)}>
          {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Click any empty cell to add a class. Click a class to edit.</span>
      </div>

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
                  <div key={`${si}-${di}`} className="sg-cell builder-cell" onClick={() => openCell(di, si)}>
                    {s ? (
                      <div className={`sg-class ${s.color ?? ""}`}>
                        <div className="sg-class-name">{s.courses?.code ?? "—"}</div>
                        <div className="sg-class-room">{s.rooms?.code ?? ""}{s.profiles?.full_name ? ` · ${s.profiles.full_name.split(" ")[0]}` : ""}</div>
                      </div>
                    ) : <div className="add-class-btn">+</div>}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {editing && (
        <div className="modal-overlay active" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setEditing(null)}>
          <div className="card" style={{ width: "min(460px, 95%)" }} onClick={e => e.stopPropagation()}>
            <div className="card-title">📝 {editing.existing ? "Edit" : "Add"} Class — {DAYS[editing.day]} {TIME_SLOTS[editing.slot_index]}</div>
            <div className="form-col"><label>Course</label>
              <select className="form-input" value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}>
                <option value="">— Select —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select>
            </div>
            <div className="form-row" style={{ marginTop: 10 }}>
              <div className="form-col"><label>Room</label>
                <select className="form-input" value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}>
                  <option value="">—</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.code}</option>)}
                </select>
              </div>
              <div className="form-col"><label>Teacher</label>
                <select className="form-input" value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })}>
                  <option value="">—</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="form-col"><label>Color</label>
                <select className="form-input" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}>
                  {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              {editing.existing && <button className="btn btn-danger" onClick={remove}>Delete</button>}
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-accent" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

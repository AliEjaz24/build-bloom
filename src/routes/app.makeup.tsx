import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { TIME_SLOTS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/app/makeup")({ component: MakeupPage });

interface Req {
  id: string; teacher_id: string; course_id: string | null;
  original_date: string | null; proposed_date: string | null;
  slot_index: number | null; room_id: string | null; reason: string | null; status: string | null;
  courses?: { code: string; title: string } | null;
  rooms?: { code: string } | null;
  profiles?: { full_name: string } | null;
}
interface Course { id: string; code: string; title: string; }
interface Room { id: string; code: string; }

function MakeupPage() {
  const { profile, role } = useAuth();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState({ course_id: "", original_date: "", proposed_date: "", slot_index: 0, room_id: "", reason: "" });

  const load = async () => {
    let q = supabase.from("makeup_requests")
      .select("*, courses(code,title), rooms(code), profiles(full_name)")
      .order("created_at", { ascending: false });
    if (role === "teacher" && profile) q = q.eq("teacher_id", profile.id);
    const { data } = await q;
    setReqs((data as Req[]) ?? []);
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from("courses").select("id,code,title").order("code"),
      supabase.from("rooms").select("id,code").order("code"),
    ]);
    setCourses((c as Course[]) ?? []);
    setRooms((r as Room[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id, role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase.from("makeup_requests").insert({
      teacher_id: profile.id, course_id: form.course_id || null,
      original_date: form.original_date || null, proposed_date: form.proposed_date || null,
      slot_index: form.slot_index, room_id: form.room_id || null, reason: form.reason || null,
    });
    if (error) toast.error(error.message); else { toast.success("Request submitted"); load(); }
  };
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("makeup_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };

  return (
    <>
      {role === "teacher" && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-title">🔄 Request a Makeup Class</div>
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-col"><label>Course</label>
                <select className="form-input" value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} required>
                  <option value="">— Select —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
                </select>
              </div>
              <div className="form-col"><label>Original Date</label>
                <input type="date" className="form-input" value={form.original_date} onChange={e => setForm({ ...form, original_date: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-col"><label>Proposed Date</label>
                <input type="date" className="form-input" value={form.proposed_date} onChange={e => setForm({ ...form, proposed_date: e.target.value })} required />
              </div>
              <div className="form-col"><label>Time Slot</label>
                <select className="form-input" value={form.slot_index} onChange={e => setForm({ ...form, slot_index: Number(e.target.value) })}>
                  {TIME_SLOTS.map((t, i) => <option key={i} value={i}>{t}</option>)}
                </select>
              </div>
              <div className="form-col"><label>Room</label>
                <select className="form-input" value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}>
                  <option value="">— Any —</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.code}</option>)}
                </select>
              </div>
            </div>
            <div className="form-col"><label>Reason</label>
              <textarea className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>
            <button className="btn btn-accent" style={{ marginTop: 12 }}>Submit Request</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-title">📋 {role === "admin" ? "All Makeup Requests" : "My Requests"}</div>
        {reqs.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No requests yet.</div>}
        {reqs.map(r => (
          <div key={r.id} className="request-card">
            <div className="req-course">{r.courses?.code ?? "—"} {r.courses?.title ? `· ${r.courses.title}` : ""}</div>
            <div className="req-meta">
              {role === "admin" && r.profiles?.full_name && <>👤 {r.profiles.full_name} · </>}
              📅 {r.proposed_date ?? "—"} · 🕐 {r.slot_index !== null ? TIME_SLOTS[r.slot_index] : "—"} · 🏛 {r.rooms?.code ?? "Any"}
            </div>
            {r.reason && <div className="req-meta" style={{ marginTop: 4 }}>📝 {r.reason}</div>}
            <span className={`req-status ${r.status ?? "pending"}`}>{r.status ?? "pending"}</span>
            {role === "admin" && r.status === "pending" && (
              <div className="req-actions">
                <button className="btn btn-success btn-sm" onClick={() => setStatus(r.id, "approved")}>Approve</button>
                <button className="btn btn-danger btn-sm" onClick={() => setStatus(r.id, "rejected")}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

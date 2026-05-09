import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { TIME_SLOTS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/app/cancel")({ component: CancelPage });

interface Req {
  id: string; cancel_date: string | null; slot_index: number | null;
  reason: string | null; status: string | null;
  courses?: { code: string; title: string } | null;
  profiles?: { full_name: string } | null;
}
interface Course { id: string; code: string; title: string; }

function CancelPage() {
  const { profile, role } = useAuth();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({ course_id: "", cancel_date: "", slot_index: 0, reason: "" });

  const load = async () => {
    let q = supabase.from("cancel_requests").select("*, courses(code,title), profiles(full_name)").order("created_at", { ascending: false });
    if (role === "teacher" && profile) q = q.eq("teacher_id", profile.id);
    const { data } = await q;
    setReqs((data as Req[]) ?? []);
    const { data: c } = await supabase.from("courses").select("id,code,title").order("code");
    setCourses((c as Course[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id, role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase.from("cancel_requests").insert({
      teacher_id: profile.id, course_id: form.course_id || null,
      cancel_date: form.cancel_date || null, slot_index: form.slot_index, reason: form.reason,
    });
    if (error) toast.error(error.message); else { toast.success("Submitted"); load(); }
  };
  const setStatus = async (id: string, status: string) => {
    const req = reqs.find(r => r.id === id);
    const { error } = await supabase.from("cancel_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (req?.teacher_id) {
      const code = req.courses?.code ?? "your class";
      await supabase.from("notifications").insert({
        recipient_id: req.teacher_id,
        title: `Cancellation ${status} — ${code}`,
        message: `Your cancellation request for ${code} on ${req.cancel_date} was ${status}.`,
      });
    }
    toast.success("Updated"); load();
  };

  return (
    <>
      {role === "teacher" && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-title">❌ Cancel a Class</div>
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-col"><label>Course</label>
                <select className="form-input" value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} required>
                  <option value="">— Select —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
                </select>
              </div>
              <div className="form-col"><label>Date</label>
                <input type="date" className="form-input" value={form.cancel_date} onChange={e => setForm({ ...form, cancel_date: e.target.value })} required />
              </div>
              <div className="form-col"><label>Time Slot</label>
                <select className="form-input" value={form.slot_index} onChange={e => setForm({ ...form, slot_index: Number(e.target.value) })}>
                  {TIME_SLOTS.map((t, i) => <option key={i} value={i}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-col"><label>Reason</label>
              <textarea className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required />
            </div>
            <button className="btn btn-accent" style={{ marginTop: 12 }}>Submit</button>
          </form>
        </div>
      )}
      <div className="card">
        <div className="card-title">📋 {role === "admin" ? "All Cancellation Requests" : "My Requests"}</div>
        {reqs.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No requests.</div>}
        {reqs.map(r => (
          <div key={r.id} className="request-card">
            <div className="req-course">{r.courses?.code ?? "—"} {r.courses?.title ? `· ${r.courses.title}` : ""}</div>
            <div className="req-meta">
              {role === "admin" && r.profiles?.full_name && <>👤 {r.profiles.full_name} · </>}
              📅 {r.cancel_date} · 🕐 {r.slot_index !== null ? TIME_SLOTS[r.slot_index] : "—"}
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

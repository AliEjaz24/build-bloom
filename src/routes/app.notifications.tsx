import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAMS, BATCHES, SECTIONS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notifications")({ component: NotifPage });

interface N { id: string; title: string; message: string | null; created_at: string; read: boolean | null; audience: string | null; }

function NotifPage() {
  const { profile, role } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [form, setForm] = useState({ title: "", message: "", audience: "student", batch: "", section: "" });

  const load = async () => {
    if (!profile) return;
    let q = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
    
    let courseIds: string[] = [];
    if (role === "student") {
      const { data: regs } = await supabase.from("registrations").select("course_id").eq("student_id", profile.id);
      courseIds = (regs as any[])?.map(x => x.course_id).filter(Boolean) || [];
    }

    if (role === "student") {
      const b = profile.batch ? String(profile.batch) : null;
      const s = profile.section || null;

      // Base filters for any student
      const parts = [
        `recipient_id.eq.${profile.id}`,
        "recipient_id.is.null"
      ];

      // Add course-specific filters
      if (courseIds.length > 0) {
        parts.push(`course_id.in.(${courseIds.join(",")})`);
      }

      // Add audience-specific filters (Batch/Section)
      let studentAudience = "audience.eq.student";
      if (b) studentAudience = `and(${studentAudience},or(batch.is.null,batch.eq.${b}))`;
      if (s) studentAudience = `and(${studentAudience},or(section.is.null,section.eq.${s}))`;
      
      parts.push(studentAudience);

      q = q.or(parts.join(","));
    } else if (role) {
      q = q.or(`recipient_id.eq.${profile.id},audience.eq.${role},recipient_id.is.null`);
    } else {
      q = q.or(`recipient_id.eq.${profile.id},recipient_id.is.null`);
    }
    
    const { data } = await q;
    setItems((data as N[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id, role]);

  const markRead = async (id: string) => {
    if (!profile) return;
    
    // 1. Mark as read in localStorage (for immediate UI update and general notifs)
    const readIds = JSON.parse(localStorage.getItem("ibit_read_notifs") || "[]");
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem("ibit_read_notifs", JSON.stringify(readIds));
    }

    // 2. Mark as read in DB (if personal notif)
    await supabase.from("notifications").update({ read: true }).eq("id", id).eq("recipient_id", profile.id);
    
    load();
    // Dispatch a storage event so the sidebar badge updates immediately
    window.dispatchEvent(new Event("storage"));
  };
  const broadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { 
      title: form.title, 
      message: form.message, 
      audience: form.audience as any 
    };
    if (form.audience === "student") {
      if (form.batch) payload.batch = form.batch;
      if (form.section) payload.section = form.section;
    }
    const { error } = await supabase.from("notifications").insert(payload);
    if (error) toast.error(error.message); else { toast.success("Sent"); setForm({ title: "", message: "", audience: "student", batch: "", section: "" }); load(); }
  };

  return (
    <>
      {role === "admin" && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-title">📣 Broadcast Notification</div>
          <form onSubmit={broadcast}>
            <div className="form-row">
              <div className="form-col"><label>Title</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-col"><label>Audience</label>
                <select className="form-input" value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>
            {form.audience === "student" && (
              <div className="form-row" style={{ marginTop: 12 }}>
                <div className="form-col"><label>Target Batch (Optional)</label>
                  <select className="form-input" value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })}>
                    <option value="">All Batches</option>
                    {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-col"><label>Target Section (Optional)</label>
                  <select className="form-input" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}>
                    <option value="">All Sections</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div className="form-col"><label>Message</label>
              <textarea className="form-textarea" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
            </div>
            <button className="btn btn-accent" style={{ marginTop: 12 }}>Send</button>
          </form>
        </div>
      )}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-title" style={{ padding: "20px 20px 0" }}>🔔 Notifications</div>
        {items.length === 0 && <div style={{ padding: 20, fontSize: 13, color: "var(--text-muted)" }}>No notifications.</div>}
        {items.map(n => (
          <div key={n.id} className={`notif-item ${n.read ? "" : "notif-unread"}`} onClick={() => markRead(n.id)} style={{ cursor: "pointer" }}>
            <div className="notif-icon blue">🔔</div>
            <div style={{ flex: 1 }}>
              <div className="notif-title">{n.title}</div>
              {n.message && <div className="notif-msg">{n.message}</div>}
              <div className="notif-time">{new Date(n.created_at).toLocaleString()}{n.audience ? ` · for ${n.audience}s` : ""}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

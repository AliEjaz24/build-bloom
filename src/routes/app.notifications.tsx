import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notifications")({ component: NotifPage });

interface N { id: string; title: string; message: string | null; created_at: string; read: boolean | null; audience: string | null; }

function NotifPage() {
  const { profile, role } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [form, setForm] = useState({ title: "", message: "", audience: "student" });

  const load = async () => {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
    setItems((data as N[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    if (!profile) return;
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    load();
  };
  const markAllRead = async () => {
    if (!profile || !role) return;
    await supabase.from("notifications").update({ read: true })
      .or(`recipient_id.eq.${profile.id},audience.eq.${role}`)
      .eq("read", false);
    toast.success("All marked as read");
    load();
  };
  const broadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("notifications").insert({ title: form.title, message: form.message, audience: form.audience as "admin" | "student" | "teacher" });
    if (error) toast.error(error.message); else { toast.success("Sent"); setForm({ title: "", message: "", audience: "student" }); load(); }
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
            <div className="form-col"><label>Message</label>
              <textarea className="form-textarea" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
            </div>
            <button className="btn btn-accent" style={{ marginTop: 12 }}>Send</button>
          </form>
        </div>
      )}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-title" style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🔔 Notifications</span>
          {items.some(n => !n.read) && (
            <button className="btn btn-sm" onClick={markAllRead} style={{ fontSize: 12 }}>Mark all read</button>
          )}
        </div>
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

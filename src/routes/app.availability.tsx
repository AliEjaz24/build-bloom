import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { TIME_SLOTS, DAYS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/app/availability")({ component: AvailabilityPage });

function AvailabilityPage() {
  const { profile } = useAuth();
  const [map, setMap] = useState<Record<string, string>>({});

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from("availability").select("*").eq("teacher_id", profile.id);
    const m: Record<string, string> = {};
    (data ?? []).forEach((r: { day: number; slot_index: number; status: string }) => { m[`${r.day}-${r.slot_index}`] = r.status; });
    setMap(m);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  const toggle = async (d: number, s: number) => {
    if (!profile) return;
    const key = `${d}-${s}`;
    const cur = map[key];
    const next = cur === "available" ? "busy" : cur === "busy" ? "" : "available";
    if (!next) {
      await supabase.from("availability").delete().eq("teacher_id", profile.id).eq("day", d).eq("slot_index", s);
    } else {
      await supabase.from("availability").upsert({ teacher_id: profile.id, day: d, slot_index: s, status: next }, { onConflict: "teacher_id,day,slot_index" });
    }
    load();
  };

  return (
    <div className="card">
      <div className="card-title">🕐 Weekly Availability</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Click a slot to toggle: empty → available → busy → empty.</div>
      <div className="avail-grid">
        <div className="avail-header">TIME</div>
        {DAYS.map(d => <div key={d} className="avail-header">{d}</div>)}
        {TIME_SLOTS.map((t, si) => (
          <>
            <div key={`t-${si}`} className="avail-header">{t}</div>
            {DAYS.map((_, di) => {
              const status = map[`${di}-${si}`] || "";
              return <button key={`${di}-${si}`} className={`avail-slot ${status}`} onClick={() => toggle(di, si)}>
                {status === "available" ? "✓" : status === "busy" ? "✕" : "—"}
              </button>;
            })}
          </>
        ))}
      </div>
      <button className="btn btn-accent" style={{ marginTop: 16 }} onClick={() => toast.success("Availability is auto-saved")}>✓ Saved</button>
    </div>
  );
}

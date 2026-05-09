import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ScheduleGrid } from "./app.dashboard";
import { PROGRAMS, BATCHES, SECTIONS } from "@/lib/constants";

export const Route = createFileRoute("/app/timetable")({ component: TimetablePage });

function TimetablePage() {
  const { profile, role } = useAuth();
  const [program, setProgram] = useState(profile?.program || "BBIT");
  const [batch, setBatch] = useState<number>(profile?.batch || 2024);
  const [section, setSection] = useState(profile?.section || "A");
  const [slots, setSlots] = useState<any[]>([]);

  const load = async () => {
    let q = supabase.from("timetable_slots")
      .select("*, courses(code,title,credit_hours), rooms(code), profiles(full_name)");
    
    if (role === "teacher" && profile) {
      q = q.eq("teacher_id", profile.id);
      const { data } = await q;
      setSlots(data ?? []);
    } else if (role === "student" && profile) {
      const { data: regs } = await supabase.from("registrations").select("course_id").eq("student_id", profile.id);
      const courseIds = (regs || []).map((r: any) => r.course_id).filter(Boolean);
      if (courseIds.length > 0) {
        q = q.eq("program", profile.program || "BBIT")
             .eq("batch", profile.batch || 2024)
             .eq("section", profile.section || "A")
             .in("course_id", courseIds);
        const { data } = await q;
        setSlots(data ?? []);
      } else {
        setSlots([]);
      }
    } else {
      q = q.eq("program", program).eq("batch", batch).eq("section", section);
      const { data } = await q;
      setSlots(data ?? []);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [program, batch, section, role, profile?.id]);

  return (
    <>
      {role === "admin" && (
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
          <button className="btn btn-accent" onClick={load}>🔄 Reload</button>
          <button className="btn btn-outline" onClick={() => window.print()}>📄 Print / PDF</button>
        </div>
      )}
      <div className="card">
        <div className="card-title">📅 Weekly Schedule</div>
        <ScheduleGrid slots={slots} />
      </div>
    </>
  );
}

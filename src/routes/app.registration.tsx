import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/registration")({ component: RegistrationPage });

interface Course { id: string; code: string; title: string; credit_hours: number; program: string | null; semester: number | null; }

function RegistrationPage() {
  const { profile, semester } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [termName, setTermName] = useState("");

  const load = async () => {
    // 1. Fetch all terms
    const { data: allTerms } = await supabase.from("terms").select("*").order("code", { ascending: false });
    let terms = (allTerms as any[]) ?? [];

    // 2. Match Term Planner logic: Filter by student batch AND semester
    if (profile?.batch) {
      const batchStr = profile.batch.toString().slice(-2);
      terms = terms.filter(t => 
        (t.label.includes(batchStr) || t.code.includes(batchStr)) &&
        (t.label.toLowerCase().includes(semester.toLowerCase()) || t.code.toLowerCase().includes(semester.toLowerCase()))
      );
    }

    // 3. Select the best term: Prefer active, else pick the latest from the filtered list
    let selectedTerm = terms.find(t => t.active) || terms[0];

    if (!selectedTerm) {
      setCourses([]);
      setTermName("");
      return;
    }

    setTermName(selectedTerm.label);
    const targetTermId = selectedTerm.id;

    // 2. Fetch courses offered in that term (all sections for this batch)
    let tcQ = supabase.from("term_courses").select("course_id").eq("term_id", targetTermId);
    
    const { data: termCourses } = await tcQ;
    const offeredCourseIds = (termCourses || []).map(tc => tc.course_id);

    if (offeredCourseIds.length === 0) {
      setCourses([]);
    } else {
      const { data } = await supabase.from("courses")
        .select("*")
        .in("id", offeredCourseIds)
        .order("code");
      
      setCourses((data as Course[]) ?? []);
    }

    // 3. Fetch user's registrations
    if (profile) {
      const { data: regs } = await supabase
        .from("registrations")
        .select("course_id")
        .eq("student_id", profile.id);
      setEnrolledIds(new Set((regs ?? []).map((r: { course_id: string }) => r.course_id)));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id, profile?.batch, profile?.program, semester]);

  const enrolled = courses.filter(c => enrolledIds.has(c.id));
  const ch = enrolled.reduce((s, c) => s + c.credit_hours, 0);
  const max = 21;
  const filtered = courses.filter(c =>
    !enrolledIds.has(c.id) &&
    (c.code.toLowerCase().includes(search.toLowerCase()) || c.title.toLowerCase().includes(search.toLowerCase()))
  );

  const add = async (id: string, hrs: number) => {
    if (!profile) return;
    if (ch + hrs > max) { toast.error(`Would exceed ${max} CH limit`); return; }
    const { error } = await supabase.from("registrations").insert({ student_id: profile.id, course_id: id });
    if (error) toast.error(error.message); else { toast.success("Enrolled"); load(); }
  };
  const drop = async (id: string) => {
    if (!profile) return;
    const { error } = await supabase.from("registrations").delete().eq("student_id", profile.id).eq("course_id", id);
    if (error) toast.error(error.message); else { toast.success("Dropped"); load(); }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title">📊 Credit Hours</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span>{ch} / {max} CH used</span><span>{enrolled.length} courses</span>
        </div>
        <div className="ch-bar-wrap"><div className="ch-bar" style={{ width: `${Math.min(100, (ch/max)*100)}%` }} /></div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">📚 Available Courses {termName && <span style={{ fontSize: 12, color: "var(--accent)", marginLeft: 8 }}>({termName})</span>}</div>
          <input className="search-input" placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
          {filtered.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No matching courses.</div>}
          {filtered.map(c => (
            <div key={c.id} className="course-reg-item">
              <div>
                <div className="cri-code">{c.code}</div>
                <div className="cri-name">{c.title}</div>
                <div className="cri-meta">{c.credit_hours} CH · {c.program ?? "—"}</div>
              </div>
              <div className="cri-right"><button className="btn btn-accent btn-sm" onClick={() => add(c.id, c.credit_hours)}>+ Add</button></div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">✅ Enrolled Courses</div>
          {enrolled.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No enrolled courses yet.</div>}
          {enrolled.map(c => (
            <div key={c.id} className="course-reg-item">
              <div>
                <div className="cri-code">{c.code}</div>
                <div className="cri-name">{c.title}</div>
                <div className="cri-meta">{c.credit_hours} CH · <span className="enrolled-tag">Enrolled</span></div>
              </div>
              <div className="cri-right"><button className="btn btn-danger btn-sm" onClick={() => drop(c.id)}>Drop</button></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

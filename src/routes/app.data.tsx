import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { createTeacher } from "@/lib/teachers.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/app/data")({ component: DataPage });

type Tab = "courses" | "rooms" | "teachers";

interface Course { id: string; code: string; title: string; credit_hours: number; program: string | null; semester: number | null; color: string | null; }
interface Room { id: string; code: string; type: string | null; capacity: number | null; location: string | null; }
interface Teacher { id: string; full_name: string; email: string; department: string | null; designation: string | null; }

function DataPage() {
  const { role } = useAuth();
  const [tab, setTab] = useState<Tab>("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [c, setC] = useState({ code: "", title: "", credit_hours: 3, program: "BBIT", semester: 1 });
  const [r, setR] = useState({ code: "", type: "Classroom", capacity: 40, location: "" });
  const [t, setT] = useState({ email: "", full_name: "", department: "", designation: "", password: "" });

  const load = async () => {
    const [{ data: cs }, { data: rs }, { data: ts }] = await Promise.all([
      supabase.from("courses").select("*").order("code"),
      supabase.from("rooms").select("*").order("code"),
      supabase.from("user_roles").select("user_id, profiles!inner(id,full_name,email,department,designation)").eq("role", "teacher"),
    ]);
    setCourses((cs as Course[]) ?? []);
    setRooms((rs as Room[]) ?? []);
    type TR = { profiles: Teacher };
    setTeachers(((ts as unknown as TR[]) ?? []).map(x => x.profiles));
  };
  useEffect(() => { load(); }, []);

  if (role !== "admin") return <div className="card">Admin only.</div>;

  const addCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("courses").insert(c);
    if (error) toast.error(error.message); else { toast.success("Course added"); setC({ code: "", title: "", credit_hours: 3, program: "BBIT", semester: 1 }); load(); }
  };
  const delCourse = async (id: string) => { await supabase.from("courses").delete().eq("id", id); load(); };
  const addRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("rooms").insert(r);
    if (error) toast.error(error.message); else { toast.success("Room added"); setR({ code: "", type: "Classroom", capacity: 40, location: "" }); load(); }
  };
  const delRoom = async (id: string) => { await supabase.from("rooms").delete().eq("id", id); load(); };
  const addTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTeacher({ data: t });
      toast.success("Teacher added");
      setT({ email: "", full_name: "", department: "", designation: "", password: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add teacher");
    }
  };

  return (
    <>
      <div className="tab-bar" style={{ maxWidth: 480 }}>
        <button className={`tab-btn ${tab === "courses" ? "active" : ""}`} onClick={() => setTab("courses")}>Courses</button>
        <button className={`tab-btn ${tab === "rooms" ? "active" : ""}`} onClick={() => setTab("rooms")}>Rooms</button>
        <button className={`tab-btn ${tab === "teachers" ? "active" : ""}`} onClick={() => setTab("teachers")}>Teachers</button>
      </div>

      {tab === "courses" && (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">➕ Add Course</div>
            <form onSubmit={addCourse}>
              <div className="form-row">
                <div className="form-col"><label>Code</label><input className="form-input" value={c.code} onChange={e => setC({ ...c, code: e.target.value })} required /></div>
                <div className="form-col"><label>Title</label><input className="form-input" value={c.title} onChange={e => setC({ ...c, title: e.target.value })} required /></div>
                <div className="form-col"><label>Credit Hours</label><input type="number" className="form-input" value={c.credit_hours} onChange={e => setC({ ...c, credit_hours: Number(e.target.value) })} /></div>
              </div>
              <div className="form-row">
                <div className="form-col"><label>Program</label><input className="form-input" value={c.program} onChange={e => setC({ ...c, program: e.target.value })} /></div>
                <div className="form-col"><label>Semester</label><input type="number" className="form-input" value={c.semester} onChange={e => setC({ ...c, semester: Number(e.target.value) })} /></div>
              </div>
              <button className="btn btn-accent">Add</button>
            </form>
          </div>
          <div className="card"><div className="card-title">📚 Courses</div>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Code</th><th>Title</th><th>CH</th><th>Program</th><th>Sem</th><th></th></tr></thead>
              <tbody>{courses.map(x => (
                <tr key={x.id}><td className="code-cell">{x.code}</td><td>{x.title}</td><td>{x.credit_hours}</td><td>{x.program}</td><td>{x.semester}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => delCourse(x.id)}>Delete</button></td></tr>
              ))}</tbody>
            </table></div>
          </div>
        </>
      )}

      {tab === "rooms" && (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">➕ Add Room</div>
            <form onSubmit={addRoom}>
              <div className="form-row">
                <div className="form-col"><label>Code</label><input className="form-input" value={r.code} onChange={e => setR({ ...r, code: e.target.value })} required /></div>
                <div className="form-col"><label>Type</label><select className="form-input" value={r.type} onChange={e => setR({ ...r, type: e.target.value })}><option>Classroom</option><option>Lab</option><option>Auditorium</option></select></div>
                <div className="form-col"><label>Capacity</label><input type="number" className="form-input" value={r.capacity} onChange={e => setR({ ...r, capacity: Number(e.target.value) })} /></div>
                <div className="form-col"><label>Location</label><input className="form-input" value={r.location} onChange={e => setR({ ...r, location: e.target.value })} /></div>
              </div>
              <button className="btn btn-accent">Add</button>
            </form>
          </div>
          <div className="card"><div className="card-title">🏛 Rooms</div>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Code</th><th>Type</th><th>Capacity</th><th>Location</th><th></th></tr></thead>
              <tbody>{rooms.map(x => (
                <tr key={x.id}><td className="code-cell">{x.code}</td><td>{x.type}</td><td>{x.capacity}</td><td>{x.location}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => delRoom(x.id)}>Delete</button></td></tr>
              ))}</tbody>
            </table></div>
          </div>
        </>
      )}

      {tab === "teachers" && (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">➕ Add Teacher</div>
            <form onSubmit={addTeacher}>
              <div className="form-row">
                <div className="form-col"><label>Full Name</label><input className="form-input" value={t.full_name} onChange={e => setT({ ...t, full_name: e.target.value })} required /></div>
                <div className="form-col"><label>Email</label><input type="email" className="form-input" value={t.email} onChange={e => setT({ ...t, email: e.target.value })} required /></div>
                <div className="form-col"><label>Temp Password</label><input type="text" className="form-input" value={t.password} onChange={e => setT({ ...t, password: e.target.value })} minLength={6} required /></div>
              </div>
              <div className="form-row">
                <div className="form-col"><label>Department</label><input className="form-input" value={t.department} onChange={e => setT({ ...t, department: e.target.value })} /></div>
                <div className="form-col"><label>Designation</label><input className="form-input" value={t.designation} onChange={e => setT({ ...t, designation: e.target.value })} /></div>
              </div>
              <button className="btn btn-accent">Add Teacher</button>
            </form>
          </div>
          <div className="card"><div className="card-title">👨‍🏫 Faculty</div>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Designation</th></tr></thead>
              <tbody>{teachers.map(x => (
                <tr key={x.id}><td>{x.full_name}</td><td>{x.email}</td><td>{x.department ?? "—"}</td><td>{x.designation ?? "—"}</td></tr>
              ))}</tbody>
            </table></div>
          </div>
        </>
      )}
    </>
  );
}

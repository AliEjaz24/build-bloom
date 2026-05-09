import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createTeacherFn, updateTeacherFn, deleteTeacherFn } from "@/lib/admin.api";

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
  const [tForm, setTForm] = useState({ full_name: "", email: "", password: "", department: "Information Technology", designation: "Lecturer" });
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  const load = async () => {
    const [{ data: cs }, { data: rs }, { data: roleData }] = await Promise.all([
      supabase.from("courses").select("*").order("code"),
      supabase.from("rooms").select("*").order("code"),
      supabase.from("user_roles").select("user_id").eq("role", "teacher"),
    ]);
    setCourses((cs as Course[]) ?? []);
    setRooms((rs as Room[]) ?? []);
    
    const tIds = (roleData || []).map(r => r.user_id);
    if (tIds.length > 0) {
      const { data: ts } = await supabase.from("profiles").select("id,full_name,email,department,designation").in("id", tIds);
      setTeachers((ts as Teacher[]) ?? []);
    } else {
      setTeachers([]);
    }
  };
  useEffect(() => { load(); }, []);

  if (role !== "admin") return <div className="card">Admin only.</div>;

  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCourseId) {
      const { error } = await supabase.from("courses").update(c).eq("id", editingCourseId);
      if (error) toast.error(error.message); else { toast.success("Course updated"); setEditingCourseId(null); setC({ code: "", title: "", credit_hours: 3, program: "BBIT", semester: 1 }); load(); }
    } else {
      const { error } = await supabase.from("courses").insert(c);
      if (error) toast.error(error.message); else { toast.success("Course added"); setC({ code: "", title: "", credit_hours: 3, program: "BBIT", semester: 1 }); load(); }
    }
  };
  const editCourse = (x: Course) => { setC({ code: x.code, title: x.title, credit_hours: x.credit_hours, program: x.program || "BBIT", semester: x.semester || 1 }); setEditingCourseId(x.id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const delCourse = async (id: string) => { await supabase.from("courses").delete().eq("id", id); load(); };
  
  const saveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoomId) {
      const { error } = await supabase.from("rooms").update(r).eq("id", editingRoomId);
      if (error) toast.error(error.message); else { toast.success("Room updated"); setEditingRoomId(null); setR({ code: "", type: "Classroom", capacity: 40, location: "" }); load(); }
    } else {
      const { error } = await supabase.from("rooms").insert(r);
      if (error) toast.error(error.message); else { toast.success("Room added"); setR({ code: "", type: "Classroom", capacity: 40, location: "" }); load(); }
    }
  };
  const editRoom = (x: Room) => { setR({ code: x.code, type: x.type || "Classroom", capacity: x.capacity || 40, location: x.location || "" }); setEditingRoomId(x.id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const delRoom = async (id: string) => { await supabase.from("rooms").delete().eq("id", id); load(); };

  const saveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeacherId) {
      const res = await updateTeacherFn({ id: editingTeacherId, ...tForm });
      if (res?.error) toast.error(res.error);
      else { toast.success("Teacher updated successfully"); setEditingTeacherId(null); setTForm({ full_name: "", email: "", password: "", department: "Information Technology", designation: "Lecturer" }); load(); }
    } else {
      if (tForm.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
      const res = await createTeacherFn(tForm);
      if (res?.error) toast.error(res.error);
      else { toast.success("Teacher added successfully"); setTForm({ full_name: "", email: "", password: "", department: "Information Technology", designation: "Lecturer" }); load(); }
    }
  };
  const editTeacher = (t: Teacher) => { 
    setTForm({ full_name: t.full_name, email: t.email, password: "KEEP_PASSWORD", department: t.department || "Information Technology", designation: t.designation || "Lecturer" }); 
    setEditingTeacherId(t.id); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  const delTeacher = async (id: string) => { 
    if (!confirm("Are you sure you want to delete this teacher? This will delete their authentication account as well.")) return;
    const res = await deleteTeacherFn(id);
    if (res?.error) toast.error(res.error);
    else { toast.success("Teacher deleted"); load(); }
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
            <div className="card-title">{editingCourseId ? "✏️ Edit Course" : "➕ Add Course"}</div>
            <form onSubmit={saveCourse}>
              <div className="form-row">
                <div className="form-col"><label>Code</label><input className="form-input" value={c.code} onChange={e => setC({ ...c, code: e.target.value })} required /></div>
                <div className="form-col"><label>Title</label><input className="form-input" value={c.title} onChange={e => setC({ ...c, title: e.target.value })} required /></div>
                <div className="form-col"><label>Credit Hours</label><input type="number" className="form-input" value={c.credit_hours} onChange={e => setC({ ...c, credit_hours: Number(e.target.value) })} /></div>
              </div>
              <div className="form-row">
                <div className="form-col"><label>Program</label><input className="form-input" value={c.program || ""} onChange={e => setC({ ...c, program: e.target.value })} /></div>
                <div className="form-col"><label>Semester</label><input type="number" className="form-input" value={c.semester || ""} onChange={e => setC({ ...c, semester: Number(e.target.value) })} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-accent">{editingCourseId ? "Update" : "Add"}</button>
                {editingCourseId && <button type="button" className="btn btn-outline" onClick={() => { setEditingCourseId(null); setC({ code: "", title: "", credit_hours: 3, program: "BBIT", semester: 1 }); }}>Cancel</button>}
              </div>
            </form>
          </div>
          <div className="card"><div className="card-title">📚 Courses</div>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Code</th><th>Title</th><th>CH</th><th>Program</th><th>Sem</th><th></th></tr></thead>
              <tbody>{courses.map(x => (
                <tr key={x.id}><td className="code-cell">{x.code}</td><td>{x.title}</td><td>{x.credit_hours}</td><td>{x.program}</td><td>{x.semester}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn btn-sm btn-outline" onClick={() => editCourse(x)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => delCourse(x.id)}>Delete</button>
                    </div>
                  </td></tr>
              ))}</tbody>
            </table></div>
          </div>
        </>
      )}

      {tab === "rooms" && (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">{editingRoomId ? "✏️ Edit Room" : "➕ Add Room"}</div>
            <form onSubmit={saveRoom}>
              <div className="form-row">
                <div className="form-col"><label>Code</label><input className="form-input" value={r.code} onChange={e => setR({ ...r, code: e.target.value })} required /></div>
                <div className="form-col"><label>Type</label><select className="form-input" value={r.type || ""} onChange={e => setR({ ...r, type: e.target.value })}><option>Classroom</option><option>Lab</option><option>Auditorium</option><option>Seminar Hall</option></select></div>
                <div className="form-col"><label>Capacity</label><input type="number" className="form-input" value={r.capacity || ""} onChange={e => setR({ ...r, capacity: Number(e.target.value) })} /></div>
                <div className="form-col"><label>Location</label><input className="form-input" value={r.location || ""} onChange={e => setR({ ...r, location: e.target.value })} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-accent">{editingRoomId ? "Update" : "Add"}</button>
                {editingRoomId && <button type="button" className="btn btn-outline" onClick={() => { setEditingRoomId(null); setR({ code: "", type: "Classroom", capacity: 40, location: "" }); }}>Cancel</button>}
              </div>
            </form>
          </div>
          <div className="card"><div className="card-title">🏛 Rooms</div>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Code</th><th>Type</th><th>Capacity</th><th>Location</th><th></th></tr></thead>
              <tbody>{rooms.map(x => (
                <tr key={x.id}><td className="code-cell">{x.code}</td><td>{x.type}</td><td>{x.capacity}</td><td>{x.location}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn btn-sm btn-outline" onClick={() => editRoom(x)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => delRoom(x.id)}>Delete</button>
                    </div>
                  </td></tr>
              ))}</tbody>
            </table></div>
          </div>
        </>
      )}

      {tab === "teachers" && (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">{editingTeacherId ? "✏️ Edit Teacher" : "➕ Add Teacher"}</div>
            <form onSubmit={saveTeacher}>
              <div className="form-row">
                <div className="form-col"><label>Full Name</label><input className="form-input" value={tForm.full_name} onChange={e => setTForm({ ...tForm, full_name: e.target.value })} required /></div>
                {!editingTeacherId && <div className="form-col"><label>Email</label><input type="email" className="form-input" value={tForm.email} onChange={e => setTForm({ ...tForm, email: e.target.value })} required /></div>}
                {!editingTeacherId && <div className="form-col"><label>Password</label><input type="password" className="form-input" placeholder="Min 8 characters" value={tForm.password} onChange={e => setTForm({ ...tForm, password: e.target.value })} required minLength={8} /></div>}
              </div>
              <div className="form-row">
                <div className="form-col"><label>Department</label><input className="form-input" value={tForm.department} onChange={e => setTForm({ ...tForm, department: e.target.value })} required /></div>
                <div className="form-col"><label>Designation</label><input className="form-input" value={tForm.designation} onChange={e => setTForm({ ...tForm, designation: e.target.value })} required /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-accent">{editingTeacherId ? "Update Teacher" : "Add Teacher"}</button>
                {editingTeacherId && <button type="button" className="btn btn-outline" onClick={() => { setEditingTeacherId(null); setTForm({ full_name: "", email: "", password: "", department: "Information Technology", designation: "Lecturer" }); }}>Cancel</button>}
              </div>
            </form>
          </div>
          <div className="card"><div className="card-title">👨‍🏫 Faculty</div>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Designation</th><th></th></tr></thead>
              <tbody>{teachers.map(t => (
                <tr key={t.id}><td>{t.full_name}</td><td>{t.email}</td><td>{t.department ?? "—"}</td><td>{t.designation ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn btn-sm btn-outline" onClick={() => editTeacher(t)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => delTeacher(t.id)}>Delete</button>
                    </div>
                  </td></tr>
              ))}</tbody>
            </table></div>
          </div>
        </>
      )}
    </>
  );
}

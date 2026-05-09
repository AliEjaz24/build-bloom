import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

// --- Types ---
export type AppRole = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Room = Database["public"]["Tables"]["rooms"]["Row"];
export type Slot = Database["public"]["Tables"]["timetable_slots"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Registration = Database["public"]["Tables"]["registrations"]["Row"];
export type MakeupRequest = Database["public"]["Tables"]["makeup_requests"]["Row"];
export type CancelRequest = Database["public"]["Tables"]["cancel_requests"]["Row"];
export type Availability = Database["public"]["Tables"]["availability"]["Row"];

// --- API Functions ---

/**
 * Profiles & Roles
 */
export const api = {
  profiles: {
    get: (id: string) => supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    update: (id: string, data: Partial<Profile>) => supabase.from("profiles").update(data).eq("id", id),
  },
  roles: {
    get: (userId: string) => supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    count: (role: AppRole) => supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", role),
  },

  /**
   * Courses
   */
  courses: {
    list: () => supabase.from("courses").select("*").order("code"),
    add: (data: any) => supabase.from("courses").insert(data),
    update: (id: string, data: any) => supabase.from("courses").update(data).eq("id", id),
    delete: (id: string) => supabase.from("courses").delete().eq("id", id),
    count: () => supabase.from("courses").select("id", { count: "exact", head: true }),
  },

  /**
   * Rooms
   */
  rooms: {
    list: () => supabase.from("rooms").select("*").order("code"),
    add: (data: any) => supabase.from("rooms").insert(data),
    update: (id: string, data: any) => supabase.from("rooms").update(data).eq("id", id),
    delete: (id: string) => supabase.from("rooms").delete().eq("id", id),
    count: () => supabase.from("rooms").select("id", { count: "exact", head: true }),
  },

  /**
   * Timetable Slots
   */
  timetable: {
    listBySection: (program: string, batch: number, section: string) =>
      supabase.from("timetable_slots")
        .select("*, courses(code,title,credit_hours), rooms(code), profiles(full_name)")
        .eq("program", program).eq("batch", batch).eq("section", section),
    listByTeacher: (teacherId: string) =>
      supabase.from("timetable_slots")
        .select("*, courses(code,title,credit_hours), rooms(code), profiles(full_name)")
        .eq("teacher_id", teacherId),
    save: (data: any) => supabase.from("timetable_slots").upsert(data),
    delete: (id: string) => supabase.from("timetable_slots").delete().eq("id", id),
    count: () => supabase.from("timetable_slots").select("id", { count: "exact", head: true }),
  },

  /**
   * Registrations
   */
  registrations: {
    listByStudent: (studentId: string) => supabase.from("registrations").select("course_id, courses(credit_hours)").eq("student_id", studentId),
    add: (studentId: string, courseId: string) => supabase.from("registrations").insert({ student_id: studentId, course_id: courseId }),
    drop: (studentId: string, courseId: string) => supabase.from("registrations").delete().eq("student_id", studentId).eq("course_id", courseId),
  },

  /**
   * Makeup Requests
   */
  makeups: {
    listPending: () =>
      supabase.from("makeup_requests")
        .select("id,status,proposed_date,slot_index,created_at,courses(code,title),profiles(full_name)")
        .eq("status", "pending").order("created_at", { ascending: false }),
    listByTeacher: (teacherId: string) =>
      supabase.from("makeup_requests")
        .select("id,status,proposed_date,slot_index,created_at,courses(code,title),profiles(full_name)")
        .eq("teacher_id", teacherId).eq("status", "pending")
        .order("created_at", { ascending: false }),
    create: (data: any) => supabase.from("makeup_requests").insert(data),
    setStatus: (id: string, status: string) => supabase.from("makeup_requests").update({ status }).eq("id", id),
    countPending: () => supabase.from("makeup_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  },

  /**
   * Cancel Requests
   */
  cancellations: {
    list: () => supabase.from("cancel_requests").select("*, courses(code,title), profiles(full_name)").order("created_at", { ascending: false }),
    create: (data: any) => supabase.from("cancel_requests").insert(data),
    setStatus: (id: string, status: string) => supabase.from("cancel_requests").update({ status }).eq("id", id),
  },

  /**
   * Availability
   */
  availability: {
    getByTeacher: (teacherId: string) => supabase.from("availability").select("*").eq("teacher_id", teacherId),
    upsert: (data: any) => supabase.from("availability").upsert(data, { onConflict: "teacher_id,day,slot_index" }),
    delete: (teacherId: string, day: number, slotIndex: number) =>
      supabase.from("availability").delete().eq("teacher_id", teacherId).eq("day", day).eq("slot_index", slotIndex),
  },

  /**
   * Notifications
   */
  notifications: {
    list: (profileId: string, role: AppRole | null) => {
      let q = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
      if (role) {
        q = q.or(`recipient_id.eq.${profileId},audience.eq.${role},recipient_id.is.null`);
      } else {
        q = q.or(`recipient_id.eq.${profileId},recipient_id.is.null`);
      }
      return q;
    },
    getUnreadCount: (profileId: string, role: AppRole | null) => {
      let q = supabase.from("notifications").select("id").eq("read", false);
      if (role) {
        q = q.or(`recipient_id.eq.${profileId},audience.eq.${role},recipient_id.is.null`);
      } else {
        q = q.or(`recipient_id.eq.${profileId},recipient_id.is.null`);
      }
      return q;
    },
    markRead: (id: string) => supabase.from("notifications").update({ read: true }).eq("id", id),
    send: (data: any) => supabase.from("notifications").insert(data),
  },

  /**
   * Terms & Planner
   */
  terms: {
    list: () => supabase.from("terms").select("id,code,label").order("code"),
    getOfferedCourses: (termId: string, program: string, batch: number, section: string) =>
      supabase.from("term_courses")
        .select("*, courses(id,code,title,credit_hours)")
        .eq("term_id", termId).eq("section", section),
  }
};

// admin.api.ts
// Uses Supabase Admin REST API directly via fetch — no createServerFn needed.
// Works locally and on any deployment since it runs in the browser with the
// service role key read from import.meta.env (VITE_ prefixed).

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    "apikey": SERVICE_ROLE_KEY,
  };
}

// ── CREATE ──────────────────────────────────────────────────────────────────
export async function createTeacherFn(data: {
  email: string;
  password: string;
  full_name: string;
  department: string;
  designation: string;
}) {
  const { email, password, full_name, department, designation } = data;

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "teacher", department, designation },
    }),
  });

  const authData = await authRes.json();

  if (!authRes.ok) {
    const msg = authData?.msg || authData?.message || "Failed to create auth user";
    if (authRes.status === 422 || msg.toLowerCase().includes("already")) {
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
        headers: adminHeaders(),
      });
      const listData = await listRes.json();
      const existing = listData?.users?.[0];
      if (!existing?.id) return { error: "User exists but could not be found." };

      await upsertProfileAndRole(existing.id, { full_name, email, department, designation }, "teacher");
      return { success: true, message: "Existing user promoted to teacher." };
    }
    return { error: msg };
  }

  const uid = authData?.id;
  if (!uid) return { error: "User created but no ID returned." };

  const { error } = await upsertProfileAndRole(uid, { full_name, email, department, designation }, "teacher");
  if (error) return { error };

  return { success: true };
}

export async function createStudentFn(data: {
  email: string;
  password: string;
  full_name: string;
  program: string;
  batch: string;
  section: string;
}) {
  const { email, password, full_name, program, batch, section } = data;

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "student", program, batch, section },
    }),
  });

  const authData = await authRes.json();

  if (!authRes.ok) {
    const msg = authData?.msg || authData?.message || "Failed to create auth user";
    if (authRes.status === 422 || msg.toLowerCase().includes("already")) {
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
        headers: adminHeaders(),
      });
      const listData = await listRes.json();
      const existing = listData?.users?.[0];
      if (!existing?.id) return { error: "User exists but could not be found." };

      await upsertProfileAndRole(existing.id, { full_name, email, program, batch, section }, "student");
      return { success: true, message: "Existing user promoted to student." };
    }
    return { error: msg };
  }

  const uid = authData?.id;
  if (!uid) return { error: "User created but no ID returned." };

  const { error } = await upsertProfileAndRole(uid, { full_name, email, program, batch, section }, "student");
  if (error) return { error };

  return { success: true };
}

// ── UPDATE ──────────────────────────────────────────────────────────────────
export async function updateTeacherFn(data: {
  id: string;
  full_name: string;
  department: string;
  designation: string;
}) {
  const { id, full_name, department, designation } = data;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ full_name, department, designation }),
  });
  if (!res.ok) {
    const err = await res.json();
    return { error: err?.message || "Failed to update teacher" };
  }
  return { success: true };
}

export async function updateStudentFn(data: {
  id: string;
  full_name: string;
  program: string;
  batch: string;
  section: string;
}) {
  const { id, full_name, program, batch, section } = data;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ full_name, program, batch, section }),
  });
  if (!res.ok) {
    const err = await res.json();
    return { error: err?.message || "Failed to update student" };
  }
  return { success: true };
}

// ── DELETE ──────────────────────────────────────────────────────────────────
export async function deleteTeacherFn(id: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err?.message || "Failed to delete teacher" };
  }
  return { success: true };
}

export async function deleteStudentFn(id: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err?.message || "Failed to delete student" };
  }
  return { success: true };
}

// ── COURSES ─────────────────────────────────────────────────────────────────
export async function createCourseFn(data: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/courses`, {
    method: "POST",
    headers: { ...adminHeaders(), "Prefer": "return=minimal" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); return { error: e?.message || "Failed" }; }
  return { success: true };
}

export async function updateCourseFn({ id, ...data }: { id: string;[k: string]: any }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?id=eq.${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); return { error: e?.message || "Failed" }; }
  return { success: true };
}

export async function deleteCourseFn(id: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?id=eq.${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!res.ok) { const e = await res.json(); return { error: e?.message || "Failed" }; }
  return { success: true };
}

// ── ROOMS ────────────────────────────────────────────────────────────────────
export async function createRoomFn(data: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rooms`, {
    method: "POST",
    headers: { ...adminHeaders(), "Prefer": "return=minimal" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); return { error: e?.message || "Failed" }; }
  return { success: true };
}

export async function updateRoomFn({ id, ...data }: { id: string;[k: string]: any }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rooms?id=eq.${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); return { error: e?.message || "Failed" }; }
  return { success: true };
}

export async function deleteRoomFn(id: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rooms?id=eq.${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!res.ok) { const e = await res.json(); return { error: e?.message || "Failed" }; }
  return { success: true };
}

// ── HELPER ───────────────────────────────────────────────────────────────────
async function upsertProfileAndRole(
  uid: string,
  profile: any,
  role: "teacher" | "student"
): Promise<{ error?: string }> {
  const pRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: { ...adminHeaders(), "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: uid, ...profile }),
  });
  if (!pRes.ok) {
    const e = await pRes.json();
    return { error: e?.message || "Profile upsert failed" };
  }

  const rRes = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?on_conflict=user_id,role`, {
    method: "POST",
    headers: { ...adminHeaders(), "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: uid, role }),
  });
  if (!rRes.ok) {
    const e = await rRes.json();
    return { error: e?.message || "Role upsert failed" };
  }

  return {};
}
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export const createTeacherFn = createServerFn("POST", async (data: any) => {
  const { email, password, full_name, department, designation } = data;
  
  logger.info("Admin attempting to create new teacher", { email, department });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  const supabase = createClient(supabaseUrl!, supabaseKey!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role: "teacher",
        department,
        designation
      }
    }
  });

  if (authErr) {
    logger.error("Failed to create teacher auth user", { error: authErr.message });
    return { error: authErr.message };
  }

  const userId = authData.user?.id;
  if (!userId) {
    logger.error("Failed to retrieve user ID from signup response");
    return { error: "Failed to create user (no ID returned)." };
  }

  await supabase.from("profiles").upsert({
    id: userId,
    full_name,
    email,
    department,
    designation
  });

  await supabase.from("user_roles").upsert({
    user_id: userId,
    role: "teacher"
  });

  logger.info("Teacher successfully created and profiles updated", { userId, email });
  return { success: true };
});

export const updateTeacherFn = createServerFn("POST", async (data: any) => {
  const { id, full_name, department, designation } = data;
  
  logger.info("Admin attempting to update teacher", { id });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need Service Role for direct profile updates if RLS is strict

  if (!supabaseKey) {
    return { error: "Service Role Key is missing." };
  }

  const supabase = createClient(supabaseUrl!, supabaseKey);

  const { error } = await supabase.from("profiles").update({
    full_name,
    department,
    designation
  }).eq("id", id);

  if (error) {
    logger.error("Failed to update teacher profile", { error: error.message });
    return { error: error.message };
  }

  logger.info("Teacher successfully updated", { id });
  return { success: true };
});

export const deleteTeacherFn = createServerFn("POST", async (id: string) => {
  logger.info("Admin attempting to delete teacher", { id });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    return { error: "Service Role Key is missing." };
  }

  const supabase = createClient(supabaseUrl!, supabaseKey);

  // Note: deleting from auth.users requires service role and management API
  // But we can delete from profiles/user_roles if they aren't protected by strict cascade or RLS
  // Ideally we use admin.deleteUser
  const { error: authErr } = await supabase.auth.admin.deleteUser(id);

  if (authErr) {
    logger.error("Failed to delete teacher auth user", { error: authErr.message });
    return { error: authErr.message };
  }

  logger.info("Teacher successfully deleted", { id });
  return { success: true };
});

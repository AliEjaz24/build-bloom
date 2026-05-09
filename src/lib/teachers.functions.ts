import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TeacherInput = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  department: z.string().optional().default(""),
  designation: z.string().optional().default(""),
  password: z.string().min(6),
});

export const createTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => TeacherInput.parse(data))
  .handler(async ({ data, context }) => {
    try {
      const { supabase, userId } = context;
      const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (roleErr) {
        console.error("has_role error", roleErr);
        return { ok: false as const, error: roleErr.message };
      }
      if (!isAdmin) return { ok: false as const, error: "Admin only" };

      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          full_name: data.full_name,
          department: data.department,
          designation: data.designation,
          role: "teacher",
        },
      });
      if (error) {
        console.error("createUser error", error);
        return { ok: false as const, error: error.message };
      }
      return { ok: true as const, id: created.user?.id ?? null };
    } catch (err) {
      console.error("createTeacher unexpected", err);
      return { ok: false as const, error: err instanceof Error ? err.message : "Unknown error" };
    }
  });

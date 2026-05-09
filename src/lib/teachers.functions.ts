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
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin only");

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
    if (error) throw new Error(error.message);
    return { id: created.user?.id };
  });

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export type AppRole = "admin" | "teacher" | "student";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  program: string | null;
  batch: number | null;
  section: string | null;
  department: string | null;
  designation: string | null;
  phone: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAux = async (uid: string) => {
    logger.debug("Loading user profile and role", { uid });
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
    ]);
    setProfile((p as Profile) ?? null);
    setRole(((r as { role: AppRole } | null)?.role) ?? null);
    logger.info("User context loaded", { uid, role: r?.role, name: p?.full_name });
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      logger.info(`Auth event: ${event}`, { userId: s?.user?.id });
      setSession(s);
      if (s?.user) {
        setLoading(true);
        setTimeout(() => { loadAux(s.user.id).finally(() => setLoading(false)); }, 0);
      } else {
        setProfile(null); setRole(null); setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      logger.debug("Initial session retrieved", { hasSession: !!data.session });
      setSession(data.session);
      if (data.session?.user) loadAux(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => { if (session?.user) await loadAux(session.user.id); };
  const signOut = async () => { logger.info("User requested sign out"); await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, role, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}

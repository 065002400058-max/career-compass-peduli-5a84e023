import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export type AccessDeniedReason = "not_registered" | "inactive" | "expired" | "rate_limited" | "error";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  mustChangePassword: boolean;
  accessDenied: AccessDeniedReason | null;
  clearAccessDenied: () => void;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshRoles: () => Promise<void>;
  refreshProfileFlags: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [accessDenied, setAccessDenied] = useState<AccessDeniedReason | null>(null);
  // Dedupe: jangan panggil RPC dua kali untuk user yang sama dalam 60 detik
  const lastVerify = useRef<{ uid: string; at: number } | null>(null);

  const loading = authLoading || rolesLoading;

  const fetchRoles = async (userId: string) => {
    setRolesLoading(true);
    try {
      const [{ data: roleData }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("must_change_password").eq("id", userId).maybeSingle(),
      ]);
      setRoles(roleData?.map((r) => r.role) ?? []);
      setMustChangePassword(Boolean(profile?.must_change_password));
    } finally {
      setRolesLoading(false);
    }
  };

  // Pemeriksaan akses dilakukan di backend (fungsi check_login_access):
  // email diambil dari JWT Google yang terverifikasi, role dari database.
  // Jika ditolak → session segera dihapus dan alasan penolakan disimpan.
  const verifyAccess = async (uid: string): Promise<boolean> => {
    if (lastVerify.current?.uid === uid && Date.now() - lastVerify.current.at < 60_000) {
      return true;
    }
    try {
      const { data, error } = await supabase.rpc("check_login_access");
      const status = (data as { status?: string } | null)?.status;
      if (!error && status === "allowed") {
        lastVerify.current = { uid, at: Date.now() };
        setAccessDenied(null);
        return true;
      }
      lastVerify.current = null;
      await supabase.auth.signOut();
      setAccessDenied(
        status === "not_registered" || status === "inactive" || status === "expired" || status === "rate_limited"
          ? status
          : "error",
      );
      return false;
    } catch {
      lastVerify.current = null;
      await supabase.auth.signOut();
      setAccessDenied("error");
      return false;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const uid = session.user.id;
          setRolesLoading(true);
          setTimeout(() => {
            void (async () => {
              const ok = await verifyAccess(uid);
              if (ok) await fetchRoles(uid);
              else setRolesLoading(false);
            })();
          }, 0);
        } else {
          setRoles([]);
          setMustChangePassword(false);
          setRolesLoading(false);
        }
        setAuthLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const uid = session.user.id;
        setRolesLoading(true);
        void (async () => {
          const ok = await verifyAccess(uid);
          if (ok) await fetchRoles(uid);
          else setRolesLoading(false);
        })();
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    lastVerify.current = null;
    setAccessDenied(null);
    await supabase.auth.signOut();
    setRoles([]);
    setMustChangePassword(false);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        roles,
        loading,
        mustChangePassword,
        accessDenied,
        clearAccessDenied: () => setAccessDenied(null),
        signOut,
        hasRole,
        refreshRoles: () => (user ? fetchRoles(user.id) : Promise.resolve()),
        refreshProfileFlags: async () => {
          if (!user) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("must_change_password")
            .eq("id", user.id)
            .maybeSingle();
          setMustChangePassword(Boolean(profile?.must_change_password));
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

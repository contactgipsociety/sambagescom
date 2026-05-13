import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AppRole = "admin" | "vendor";

export interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithRole extends Profile {
  role: AppRole;
}

interface CurrentUserState {
  loading: boolean;
  profile: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  isActive: boolean;
  refresh: () => Promise<void>;
}

export const useCurrentUser = (): CurrentUserState => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setProfile(null); setRole(null); setLoading(false); return; }
    setLoading(true);
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    setProfile(p as any);
    const roles = (r ?? []).map((x: any) => x.role as AppRole);
    setRole(roles.includes("admin") ? "admin" : roles[0] ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    load();
    if (!user) return;
    const channel = supabase
      .channel(`user-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  return {
    loading: authLoading || loading,
    profile,
    role,
    isAdmin: role === "admin",
    isActive: !!profile?.is_active,
    refresh: load,
  };
};

// ===== Admin: list & manage users =====
export const fetchAllUsers = async (): Promise<ProfileWithRole[]> => {
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const roleMap = new Map<string, AppRole>();
  (roles ?? []).forEach((r: any) => {
    const cur = roleMap.get(r.user_id);
    // admin prevails over vendor
    if (cur === "admin") return;
    roleMap.set(r.user_id, r.role as AppRole);
  });
  return (profiles ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.id) ?? "vendor" }));
};

export const setUserActive = async (userId: string, active: boolean) => {
  const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", userId);
  if (error) throw error;
};

export const setUserRole = async (userId: string, role: AppRole) => {
  // Remove existing roles then insert the new one
  await supabase.from("user_roles").delete().eq("user_id", userId);
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (error) throw error;
};

export const deleteUserProfile = async (userId: string) => {
  // We can only delete profile row (auth.users requires service role).
  // Cascading FK on user_roles will clean up.
  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error) throw error;
};

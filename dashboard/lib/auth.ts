import { createClient } from '@/lib/supabase/client'

export function createSupabaseClient() {
  return createClient()
}

export async function signIn(email: string, password: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUp(
  email: string,
  password: string,
  metadata: { clinic_id?: string; role?: string; full_name?: string } = {}
) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        clinic_id: metadata.clinic_id || "",
        role: metadata.role || "owner",
        full_name: metadata.full_name || "",
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createSupabaseClient();
  await supabase.auth.signOut();
}

export async function getSession() {
  const supabase = createSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function getClinicId(user: any): string {
  return user?.user_metadata?.clinic_id || "";
}

export function getUserRole(user: any): "owner" | "staff" {
  return user?.user_metadata?.role || "staff";
}

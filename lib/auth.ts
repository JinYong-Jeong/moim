import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
};

export async function getAppUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, nickname")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: userId,
    email: profile.email,
    displayName: profile.nickname,
  };
}

export function unauthorized() {
  return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
}

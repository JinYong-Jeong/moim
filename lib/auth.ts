import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
};

export async function getAppUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const displayName =
    data.user.user_metadata?.full_name ??
    data.user.user_metadata?.name ??
    data.user.email ??
    "친구";

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    displayName,
  };
}

export function unauthorized() {
  return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
}

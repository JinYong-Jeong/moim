import { getAppUser, unauthorized } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getAppUser();
  if (!user) return unauthorized();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, nickname, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: "프로필을 불러오지 못했어요." }, { status: 500 });
  }

  const profile = data ? { ...data, createdAt: data.created_at } : null;
  return Response.json({ user, profile });
}

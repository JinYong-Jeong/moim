import { getAppUser, unauthorized } from "@/lib/auth";
import { databaseError } from "@/lib/task-data";
import { createClient } from "@/lib/supabase/server";

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return unauthorized();

  const payload = (await request.json()) as {
    inviteCode?: string;
    nickname?: string;
  };
  const inviteCode = payload.inviteCode?.trim().toUpperCase() ?? "";
  const nickname = payload.nickname?.trim() ?? "";

  if (nickname.length < 2 || nickname.length > 20) {
    return Response.json(
      { error: "닉네임은 2~20자로 입력해 주세요." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_code_hash: await sha256(inviteCode),
    p_nickname: nickname,
  });

  if (error) return databaseError(error, "초대 코드를 다시 확인해 주세요.");
  return Response.json({ ok: true }, { status: 201 });
}

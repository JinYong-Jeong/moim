import { NextRequest } from "next/server";
import {
  inviteHash,
  memberCredentials,
  parseMemberAccess,
  rateLimitKeys,
} from "@/lib/member-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const RATE_LIMITS = [20, 5] as const;

async function checkRateLimits(
  admin: ReturnType<typeof createAdminClient>,
  keys: readonly string[],
) {
  const checks = await Promise.all(
    keys.map((key) =>
      admin.rpc("check_member_access_rate_limit", { p_key_hash: key }),
    ),
  );
  const retryAfter = Math.max(
    0,
    ...checks.map((result) => Number(result.data ?? 0)),
  );
  return retryAfter;
}

async function recordAttempt(
  admin: ReturnType<typeof createAdminClient>,
  keys: readonly string[],
  success: boolean,
) {
  const results = await Promise.all(
    keys.map((key, index) =>
      admin.rpc("record_member_access_attempt", {
        p_key_hash: key,
        p_limit: RATE_LIMITS[index],
        p_success: success,
      }),
    ),
  );
  return Math.max(0, ...results.map((result) => Number(result.data ?? 0)));
}

function limited(retryAfter: number) {
  return Response.json(
    { error: "입력을 여러 번 틀렸어요. 15분 뒤 다시 시도해 주세요." },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const member = parseMemberAccess(payload);
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";
    const keys = rateLimitKeys(ip, member.loginName);
    const credentials = memberCredentials(member.loginName, member.pin);
    const admin = createAdminClient();
    const retryAfter = await checkRateLimits(admin, keys);
    if (retryAfter > 0) return limited(retryAfter);

    const supabase = await createClient();
    const signIn = await supabase.auth.signInWithPassword(credentials);
    if (!signIn.error) {
      await recordAttempt(admin, keys, true);
      return Response.json({ ok: true });
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("login_name", member.loginName)
      .maybeSingle();

    if (existingProfile) {
      const blockedFor = await recordAttempt(admin, keys, false);
      if (blockedFor > 0) return limited(blockedFor);
      return Response.json(
        { error: "이름 또는 PIN을 확인해 주세요." },
        { status: 401 },
      );
    }

    if (!member.inviteCode) {
      const blockedFor = await recordAttempt(admin, keys, false);
      if (blockedFor > 0) return limited(blockedFor);
      return Response.json(
        { error: "처음 들어오면 6자리 초대코드가 필요해요." },
        { status: 400 },
      );
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: credentials.email,
      password: credentials.password,
      email_confirm: true,
      user_metadata: { display_name: member.displayName },
    });

    if (createError || !created.user) {
      await recordAttempt(admin, keys, false);
      return Response.json(
        { error: "들어가지 못했어요. 잠시 뒤 다시 시도해 주세요." },
        { status: 400 },
      );
    }

    const { error: profileError } = await admin.rpc("register_member_profile", {
      p_user_id: created.user.id,
      p_email: credentials.email,
      p_login_name: member.loginName,
      p_nickname: member.displayName,
      p_code_hash: inviteHash(member.inviteCode),
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      await recordAttempt(admin, keys, false);
      const message = profileError.message.includes("초대 코드")
        ? "초대코드를 다시 확인해 주세요."
        : profileError.message.includes("사용 중인 이름")
          ? "이미 사용 중인 이름이에요."
          : "들어가지 못했어요. 잠시 뒤 다시 시도해 주세요.";
      return Response.json({ error: message }, { status: 400 });
    }

    const finalSignIn = await supabase.auth.signInWithPassword(credentials);
    if (finalSignIn.error) {
      return Response.json(
        { error: "계정은 만들어졌어요. 같은 정보로 다시 들어와 주세요." },
        { status: 503 },
      );
    }

    await recordAttempt(admin, keys, true);
    return Response.json({ ok: true, created: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "입력을 다시 확인해 주세요.";
    const friendly = message.includes("서버 인증 설정")
      ? "서버 설정을 마치는 중이에요. 잠시 뒤 다시 시도해 주세요."
      : message;
    return Response.json({ error: friendly }, { status: 400 });
  }
}

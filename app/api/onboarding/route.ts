import { ensureDatabase, getD1, getInviteCode } from "@/db";
import { getAppUser, unauthorized } from "@/lib/auth";

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
  await ensureDatabase();

  const payload = (await request.json()) as {
    inviteCode?: string;
    nickname?: string;
  };
  const inviteCode = payload.inviteCode?.trim() ?? "";
  const nickname = payload.nickname?.trim() ?? "";

  if (nickname.length < 2 || nickname.length > 20) {
    return Response.json(
      { error: "닉네임은 2~20자로 입력해 주세요." },
      { status: 400 },
    );
  }

  const [inputHash, expectedHash] = await Promise.all([
    sha256(inviteCode),
    sha256(getInviteCode()),
  ]);
  if (inputHash !== expectedHash) {
    return Response.json(
      { error: "초대 코드를 다시 확인해 주세요." },
      { status: 400 },
    );
  }

  const db = getD1();
  const existing = await db
    .prepare("SELECT id FROM profiles WHERE id = ?")
    .bind(user.id)
    .first();
  if (existing) {
    return Response.json({ ok: true });
  }

  const inviteId = expectedHash.slice(0, 24);
  await db
    .prepare(
      `INSERT OR IGNORE INTO invite_codes
       (id, code_hash, is_active, max_uses, use_count)
       VALUES (?, ?, 1, 100, 0)`,
    )
    .bind(inviteId, expectedHash)
    .run();

  const code = await db
    .prepare(
      `SELECT id, is_active AS isActive, max_uses AS maxUses,
              use_count AS useCount, expires_at AS expiresAt
       FROM invite_codes WHERE code_hash = ?`,
    )
    .bind(expectedHash)
    .first<{
      id: string;
      isActive: number;
      maxUses: number | null;
      useCount: number;
      expiresAt: string | null;
    }>();

  const isExpired = code?.expiresAt
    ? new Date(code.expiresAt).getTime() < Date.now()
    : false;
  if (
    !code ||
    !code.isActive ||
    isExpired ||
    (code.maxUses !== null && code.useCount >= code.maxUses)
  ) {
    return Response.json(
      { error: "사용할 수 없는 초대 코드예요." },
      { status: 400 },
    );
  }

  await db.batch([
    db
      .prepare(
        `INSERT INTO profiles (id, email, nickname)
         VALUES (?, ?, ?)`,
      )
      .bind(user.id, user.email, nickname),
    db
      .prepare(
        `UPDATE invite_codes
         SET use_count = use_count + 1
         WHERE id = ?`,
      )
      .bind(code.id),
  ]);

  return Response.json({ ok: true }, { status: 201 });
}

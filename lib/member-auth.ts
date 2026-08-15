import "server-only";

import { createHash, createHmac } from "node:crypto";

const NAME_PATTERN = /^[\p{L}\p{N}._ -]+$/u;
const INVITE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

function pepper() {
  const value = process.env.AUTH_PEPPER;
  if (!value || value.length < 32) {
    throw new Error("서버 인증 설정이 필요해요.");
  }
  return value;
}

export function parseMemberAccess(payload: Record<string, unknown>) {
  const displayName = String(payload.name ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
  const pin = String(payload.pin ?? "");
  const inviteCode = String(payload.inviteCode ?? "")
    .trim()
    .toUpperCase();
  const loginName = displayName.replace(/\s+/g, "").toLocaleLowerCase("ko-KR");

  if (
    displayName.length < 2 ||
    displayName.length > 20 ||
    loginName.length > 40 ||
    !NAME_PATTERN.test(displayName)
  ) {
    throw new Error("이름은 2~20자의 한글·영문·숫자로 입력해 주세요.");
  }
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN은 숫자 4자리로 입력해 주세요.");
  }
  if (inviteCode && !INVITE_PATTERN.test(inviteCode)) {
    throw new Error("초대코드는 영문·숫자 6자리예요.");
  }

  return { displayName, loginName, pin, inviteCode };
}

export function memberCredentials(loginName: string, pin: string) {
  const key = pepper();
  const identity = createHmac("sha256", key)
    .update(`member:${loginName}`)
    .digest("hex");
  const password = `${createHmac("sha256", key)
    .update(`pin:${loginName}:${pin}`)
    .digest("base64url")}aA1!`;

  return {
    email: `${identity.slice(0, 40)}@members.moim.local`,
    password,
  };
}

export function inviteHash(inviteCode: string) {
  return createHash("sha256").update(inviteCode).digest("hex");
}

export function rateLimitKeys(ip: string, loginName: string) {
  const key = pepper();
  const hash = (value: string) =>
    createHmac("sha256", key).update(value).digest("hex");

  return [hash(`ip:${ip}`), hash(`member:${ip}:${loginName}`)] as const;
}

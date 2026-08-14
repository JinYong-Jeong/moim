"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginLandingProps = {
  initialError?: string;
  nextPath?: string;
};

export function LoginLanding({
  initialError = "",
  nextPath = "/",
}: LoginLandingProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, pin, inviteCode }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      router.replace(nextPath);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "들어가지 못했어요.");
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-copy">
        <span className="brand-kicker">모임</span>
        <h1>친구들과<br />가볍게 약속 잡기</h1>
        <p>이름과 4자리 PIN만 기억하면 돼요.</p>
      </div>

      <form className="login-form" onSubmit={submit}>
        <label className="login-field">
          <span>이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="친구들이 아는 이름"
            autoComplete="username"
            maxLength={20}
            required
          />
        </label>
        <label className="login-field">
          <span>PIN</span>
          <input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="숫자 4자리"
            autoComplete="current-password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            required
          />
        </label>
        <label className="login-field">
          <span>초대코드</span>
          <input
            value={inviteCode}
            onChange={(event) =>
              setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
            }
            placeholder="처음 한 번만"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={6}
          />
        </label>

        {error && <p className="field-error login-error" role="alert">{error}</p>}

        <button className="primary-button login-button" type="submit" disabled={busy}>
          {busy ? "확인 중…" : "들어가기"}
        </button>
      </form>
      <p className="login-note">
        {nextPath === "/"
          ? "초대코드는 처음 들어올 때만 필요합니다."
          : "로그인하면 공유받은 모임으로 바로 이동합니다."}
      </p>
    </main>
  );
}

"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LoginLandingProps = {
  initialError?: string;
};

export function LoginLanding({ initialError = "" }: LoginLandingProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        router.replace("/");
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }

      setNotice("확인 메일을 보냈어요. 메일 속 링크를 누르면 가입이 완료돼요.");
      setBusy(false);
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "";
      setError(toFriendlyError(message, mode));
      setBusy(false);
    }
  }

  function changeMode(nextMode: "signup" | "login") {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  return (
    <main className="login-page">
      <div className="login-orbit" aria-hidden="true">
        <span>🎮</span><span>🍜</span><span>🏃</span><span>📚</span>
        <strong>같이?</strong>
      </div>
      <div className="login-copy">
        <span className="brand-kicker">FRIEND TASK</span>
        <h1>오늘 뭐 할 사람?</h1>
        <p>
          단톡방에서 묻고 또 묻지 말고,
          <br />한 번에 모여요.
        </p>
      </div>

      <form className="login-form" onSubmit={submit}>
        <label className="login-field">
          <span>이메일</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="friend@example.com"
            autoComplete="email"
            inputMode="email"
            required
          />
        </label>
        <label className="login-field">
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="8자 이상"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={8}
            required
          />
        </label>

        {error && <p className="field-error login-error" role="alert">{error}</p>}
        {notice && <p className="login-success" role="status">{notice}</p>}

        <button className="primary-button login-button" type="submit" disabled={busy}>
          {busy ? "처리 중..." : mode === "signup" ? "가입하고 시작하기" : "로그인"}
        </button>
      </form>

      <button
        className="login-mode-button"
        type="button"
        onClick={() => changeMode(mode === "signup" ? "login" : "signup")}
      >
        {mode === "signup" ? "이미 가입했어요 · 로그인" : "처음이에요 · 가입"}
      </button>
      <p className="login-note">초대받은 친구만 들어올 수 있어요.</p>
    </main>
  );
}

function toFriendlyError(message: string, mode: "signup" | "login") {
  const normalized = message.toLowerCase();
  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "이미 가입한 이메일이에요. 아래에서 로그인으로 바꿔주세요.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호를 확인해주세요.";
  }
  if (normalized.includes("password")) {
    return "비밀번호는 8자 이상으로 입력해주세요.";
  }
  if (normalized.includes("rate limit")) {
    return "요청이 너무 많아요. 잠시 뒤 다시 시도해주세요.";
  }
  return mode === "signup" ? "가입하지 못했어요. 잠시 뒤 다시 시도해주세요." : "로그인하지 못했어요. 다시 확인해주세요.";
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginLanding() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signInError) throw signInError;
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Google 로그인을 시작하지 못했어요.",
      );
      setBusy(false);
    }
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
      {error && <p className="field-error login-error" role="alert">{error}</p>}
      <button
        className="primary-button login-button"
        type="button"
        onClick={signIn}
        disabled={busy}
      >
        {busy ? "Google로 이동 중…" : "Google로 시작하기"}
      </button>
      <p className="login-note">초대받은 친구만 들어올 수 있어요.</p>
    </main>
  );
}

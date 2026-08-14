"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [inviteCode, setInviteCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function continueToNickname(event: FormEvent) {
    event.preventDefault();
    if (!inviteCode.trim()) {
      setError("초대 코드를 입력해 주세요.");
      return;
    }
    setError("");
    setStep(2);
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteCode, nickname }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      router.replace("/");
      router.refresh();
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "가입하지 못했어요.");
      setBusy(false);
    }
  }

  return (
    <main className="onboarding-page">
      <div className="onboarding-brand">모임<span>.</span></div>
      <div className="step-indicator" aria-label={`2단계 중 ${step}단계`}>
        <span className="active" /><span className={step === 2 ? "active" : ""} />
      </div>

      {step === 1 ? (
        <form onSubmit={continueToNickname} className="onboarding-card">
          <span className="form-kicker">1 / 2</span>
          <h1>친구에게 받은<br />초대 코드가 있나요?</h1>
          <p>우리 모임은 초대받은 친구만 들어올 수 있어요.</p>
          <label className="field-label">
            초대 코드
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="예: MOIM-7H3K9"
              autoCapitalize="characters"
            />
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit">다음</button>
        </form>
      ) : (
        <form onSubmit={finish} className="onboarding-card">
          <span className="form-kicker">2 / 2</span>
          <h1>친구들이 알아볼<br />이름을 정해 주세요.</h1>
          <p>실명도, 평소 부르는 별명도 좋아요.</p>
          <label className="field-label">
            닉네임
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              minLength={2}
              maxLength={20}
              placeholder="2~20자"
            />
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="onboarding-actions">
            <button className="secondary-button" type="button" onClick={() => setStep(1)}>이전</button>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "가입 중…" : "가입 완료"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppChrome } from "@/components/common/AppChrome";
import { categoryMap, type TaskSummary } from "./types";

const categories = ["GAME", "FOOD", "SPORT", "STUDY", "DRINK", "ETC"];

function toInputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CreateTaskForm({ initial }: { initial?: TaskSummary }) {
  const router = useRouter();
  const defaults = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- New meetings should default relative to form-open time.
    const start = initial ? new Date(initial.startAt) : new Date(Date.now() + 2 * 60 * 60 * 1000);
    const deadline = initial?.deadlineAt
      ? new Date(initial.deadlineAt)
      : new Date(start.getTime() - 10 * 60 * 1000);
    return {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      category: initial?.category ?? "GAME",
      startAt: toInputDate(start),
      deadlineAt: toInputDate(deadline),
      minParticipants: initial?.minParticipants ?? 2,
      maxParticipants: initial?.maxParticipants ?? 4,
      joinUrl: initial?.joinUrl ?? "",
    };
  }, [initial]);
  const draftKey = useMemo(
    () => `moim:task-draft:v1:${initial?.id ?? "new"}`,
    [initial?.id],
  );

  const [form, setForm] = useState(() => {
    if (typeof window === "undefined") return defaults;
    try {
      const saved = window.sessionStorage.getItem(draftKey);
      return saved
        ? { ...defaults, ...(JSON.parse(saved) as Partial<typeof defaults>) }
        : defaults;
    } catch {
      window.sessionStorage.removeItem(draftKey);
      return defaults;
    }
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify(form));
    } catch {
      // Private browsing can disable session storage; the form still works in memory.
    }
  }, [draftKey, form]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      try {
        window.sessionStorage.setItem(draftKey, JSON.stringify(next));
      } catch {
        // Keep the in-memory update when storage is unavailable.
      }
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(initial ? `/api/tasks/${initial.id}` : "/api/tasks", {
        method: initial ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) throw new Error(data.error);
      try {
        window.sessionStorage.removeItem(draftKey);
      } catch {
        // The saved draft is best-effort only.
      }
      router.push(`/tasks/${initial?.id ?? data.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "저장하지 못했어요.");
      setBusy(false);
    }
  }

  return (
    <AppChrome title={initial ? "모임 수정" : "새 모임"} backHref={initial ? `/tasks/${initial.id}` : "/"} hideNav>
      <form className="task-form" onSubmit={submit}>
        <section className="form-section form-section-first">
          <span className="form-kicker">어떤 모임인가요?</span>
          <label className="field-label large-field">
            모임 이름
            <input
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="예: 오늘 10시 어몽어스"
              maxLength={60}
              required
            />
          </label>
          <div className="category-grid" role="group" aria-label="카테고리">
            {categories.map((category) => (
              <button
                type="button"
                className={form.category === category ? "selected" : ""}
                onClick={() => update("category", category)}
                key={category}
              >
                <span>{categoryMap[category].emoji}</span>
                {categoryMap[category].label}
              </button>
            ))}
          </div>
        </section>

        <section className="form-section">
          <span className="form-kicker">언제 만날까요?</span>
          <label className="field-label">
            시작 시간
            <input type="datetime-local" value={form.startAt} onChange={(event) => update("startAt", event.target.value)} required />
          </label>
          <label className="field-label">
            모집 마감
            <input type="datetime-local" value={form.deadlineAt} onChange={(event) => update("deadlineAt", event.target.value)} />
          </label>
        </section>

        <section className="form-section">
          <span className="form-kicker">몇 명이 필요해요?</span>
          <div className="number-fields">
            <div className="field-label">
              최소 인원
              <div className="stepper">
                <button type="button" onClick={() => update("minParticipants", Math.max(1, form.minParticipants - 1))}>−</button>
                <strong>{form.minParticipants}명</strong>
                <button type="button" onClick={() => update("minParticipants", Math.min(form.maxParticipants, form.minParticipants + 1))}>＋</button>
              </div>
            </div>
            <div className="field-label">
              최대 인원
              <div className="stepper">
                <button type="button" onClick={() => update("maxParticipants", Math.max(form.minParticipants, form.maxParticipants - 1))}>−</button>
                <strong>{form.maxParticipants}명</strong>
                <button type="button" onClick={() => update("maxParticipants", Math.min(100, form.maxParticipants + 1))}>＋</button>
              </div>
            </div>
          </div>
        </section>

        <section className="form-section">
          <span className="form-kicker">선택 사항</span>
          <label className="field-label">
            한 줄 설명
            <textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="준비물이나 장소를 알려 주세요." rows={3} />
          </label>
          <label className="field-label">
            참여 링크
            <input type="url" value={form.joinUrl} onChange={(event) => update("joinUrl", event.target.value)} placeholder="Discord, 지도, 화상회의 링크" />
          </label>
        </section>

        {error && <div className="inline-alert" role="alert">{error}</div>}
        <div className="sticky-submit">
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "저장 중…" : initial ? "수정 완료" : "모임 만들기"}
          </button>
        </div>
      </form>
    </AppChrome>
  );
}

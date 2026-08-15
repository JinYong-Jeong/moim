"use client";

import { useEffect, useState } from "react";
import { AppChrome } from "@/components/common/AppChrome";

export function SettingsClient({ displayName }: { displayName: string }) {
  const [permission, setPermission] = useState("확인 전");

  useEffect(() => {
    Promise.resolve().then(() => {
      if ("Notification" in window) setPermission(Notification.permission);
    });
  }, []);

  return (
    <AppChrome>
      <div className="settings-page">
        <section className="settings-profile">
          <div>{displayName.slice(0, 1)}</div>
          <span>내 프로필</span>
          <h1>{displayName}</h1>
          <p>이름과 4자리 PIN으로 로그인</p>
        </section>
        <section className="settings-list">
          <div>
            <span><strong>브라우저 알림</strong><small>모임 상세에서 각 모임별로 켤 수 있어요.</small></span>
            <em>{permission === "granted" ? "허용됨" : permission === "denied" ? "꺼짐" : "아직 안 켬"}</em>
          </div>
          <a href="/auth/signout">
            <span><strong>로그아웃</strong><small>이 기기에서 계정을 나갑니다.</small></span>
            <em>→</em>
          </a>
        </section>
        <p className="settings-footnote">친구 50~100명을 위한 작은 비공개 모임 공간</p>
      </div>
    </AppChrome>
  );
}

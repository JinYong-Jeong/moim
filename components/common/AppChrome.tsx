"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppChrome({
  children,
  title,
  eyebrow,
  backHref,
  action,
  hideNav = false,
}: {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  backHref?: string;
  action?: ReactNode;
  hideNav?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          {backHref ? (
            <Link href={backHref} className="back-button" aria-label="뒤로 가기">
              ←
            </Link>
          ) : (
            <Link href="/" className="brand-mark" aria-label="모임 홈">
              모임
            </Link>
          )}
          {title && (
            <div className="header-title">
              {eyebrow && <span>{eyebrow}</span>}
              <strong>{title}</strong>
            </div>
          )}
          {action ? (
            <div className="header-action">{action}</div>
          ) : !backHref ? (
            <Link href="/settings" className="profile-dot" aria-label="내 설정">
              내
            </Link>
          ) : null}
        </div>
      </header>
      <main className={hideNav ? "app-main no-nav" : "app-main"}>{children}</main>
      {!hideNav && (
        <nav className="bottom-nav" aria-label="주요 메뉴">
          <Link className={pathname === "/" ? "active" : ""} href="/">
            <span aria-hidden="true">⌂</span>
            모임
          </Link>
          <Link
            className={`nav-create${pathname === "/tasks/new" ? " active" : ""}`}
            href="/tasks/new"
          >
            <span aria-hidden="true">＋</span>
            만들기
          </Link>
          <Link
            className={pathname === "/settings" ? "active" : ""}
            href="/settings"
          >
            <span aria-hidden="true">☻</span>
            내 정보
          </Link>
        </nav>
      )}
    </div>
  );
}

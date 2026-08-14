import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;

  return {
    title: {
      default: "모임 — 오늘 뭐 할 사람?",
      template: "%s | 모임",
    },
    description: "친구들과 할 일을 빠르게 모으고 참여 현황을 한눈에 확인하세요.",
    applicationName: "모임",
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false },
    openGraph: {
      title: "모임 — 오늘 뭐 할 사람?",
      description: "친구들과 빠르게 모이고, 한눈에 확인해요.",
      type: "website",
      locale: "ko_KR",
      images: [{ url: socialImage, width: 1728, height: 910, alt: "모임 — 오늘 뭐 할 사람?" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "모임 — 오늘 뭐 할 사람?",
      description: "친구들과 빠르게 모이고, 한눈에 확인해요.",
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f5ef",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

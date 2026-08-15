import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  const errorUrl = new URL("/login", url.origin);
  errorUrl.searchParams.set("error", "인증에 실패했어요. 다시 시도해주세요.");
  errorUrl.searchParams.set("next", next);
  return NextResponse.redirect(errorUrl);
}

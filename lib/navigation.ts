const SAFE_ORIGIN = "https://moim.local";

export function safeNextPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }

  try {
    const url = new URL(value, SAFE_ORIGIN);
    if (url.origin !== SAFE_ORIGIN) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function loginPath(nextPath: string) {
  const query = new URLSearchParams({ next: safeNextPath(nextPath) });
  return `/login?${query.toString()}`;
}

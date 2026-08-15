import { redirect } from "next/navigation";
import { LoginLanding } from "@/components/common/LoginLanding";
import { getAppUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/navigation";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [user, query] = await Promise.all([getAppUser(), searchParams]);
  const rawNext = Array.isArray(query.next) ? query.next[0] : query.next;
  const nextPath = safeNextPath(rawNext);
  if (user) redirect(nextPath);

  const error = Array.isArray(query.error) ? query.error[0] : query.error;
  return <LoginLanding initialError={error} nextPath={nextPath} />;
}

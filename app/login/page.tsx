import { redirect } from "next/navigation";
import { LoginLanding } from "@/components/common/LoginLanding";
import { getAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAppUser();
  if (user) redirect("/");

  const { error } = await searchParams;
  return <LoginLanding initialError={error} />;
}

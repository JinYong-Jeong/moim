import { redirect } from "next/navigation";
import { LoginLanding } from "@/components/common/LoginLanding";
import { getAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getAppUser();
  if (user) redirect("/");
  return <LoginLanding />;
}

import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getAppUser();
  redirect(user ? "/" : "/login");
}

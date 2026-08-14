import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { getAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getAppUser();
  if (!user) redirect("/login");
  return <SettingsClient email={user.email} displayName={user.displayName} />;
}

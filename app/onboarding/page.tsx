import { LoginLanding } from "@/components/common/LoginLanding";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";
import { getAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getAppUser();
  return user ? <OnboardingClient /> : <LoginLanding />;
}

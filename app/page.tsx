import { HomeClient } from "@/components/home/HomeClient";
import { LoginLanding } from "@/components/common/LoginLanding";
import { getAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getAppUser();
  return user ? <HomeClient /> : <LoginLanding />;
}

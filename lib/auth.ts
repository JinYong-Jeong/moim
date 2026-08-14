import { getChatGPTUser } from "@/app/chatgpt-auth";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
};

export async function getAppUser(): Promise<AppUser | null> {
  const user = await getChatGPTUser();
  if (user) {
    return {
      id: user.userId,
      email: user.email,
      displayName: user.displayName,
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      id: "preview-user",
      email: "preview@friend-task.local",
      displayName: "프리뷰 사용자",
    };
  }

  return null;
}

export function unauthorized() {
  return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import verifyAuth from "@/lib/verifyAuth";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_token:
    "The sign-in link is invalid or has expired. Please request a new one.",
  missing_token: "No sign-in token was provided.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (sessionCookie && (await verifyAuth(sessionCookie.value))) {
    return redirect("/admin/logs");
  }

  return <LoginForm error={error ? ERROR_MESSAGES[error] : undefined} />;
}

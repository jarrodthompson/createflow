import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signInAction } from "@/server/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";

export default async function SignInPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthForm mode="sign-in" action={signInAction} />;
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signUpAction } from "@/server/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";

export default async function CreateAccountPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthForm mode="sign-up" action={signUpAction} />;
}

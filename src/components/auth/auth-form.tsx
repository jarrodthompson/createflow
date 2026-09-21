"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Card } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/primitives";
import type { AuthState } from "@/server/actions/auth";

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass() + " w-full"}>
      {pending ? "Please wait…" : label}
    </button>
  );
}

export function AuthForm({
  mode,
  action,
}: {
  mode: "sign-in" | "sign-up";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, undefined);
  const isSignUp = mode === "sign-up";

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-ink">
        {isSignUp ? "Create your account" : "Welcome back"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {isSignUp ? "Start creating digital products with AI." : "Sign in to your workspace."}
      </p>

      <form action={formAction} className="mt-5 space-y-3">
        {isSignUp && (
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Name</label>
            <input name="name" type="text" required className={inputClass} placeholder="Jane Seller" />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Password</label>
          <input
            name="password"
            type="password"
            required
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>
        )}

        <SubmitButton label={isSignUp ? "Create account" : "Sign in"} />
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to CreateFlow?{" "}
            <Link href="/create-account" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>

      {!isSignUp && (
        <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-center text-xs text-muted">
          Demo login: <span className="font-medium text-ink">demo@createflow.app</span> /{" "}
          <span className="font-medium text-ink">demo1234</span>
        </p>
      )}
    </Card>
  );
}

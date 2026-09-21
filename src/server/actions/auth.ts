"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSession, getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string } | undefined;

const credsSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signUpSchema = credsSchema.extend({
  name: z.string().min(1, "Enter your name").max(80),
});

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!rateLimit(`signin:${parsed.data.email}`, 8, 60_000)) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!rateLimit(`signup:${parsed.data.email}`, 5, 60_000)) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "An account with that email already exists." };

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  // Every new seller starts with one shop to work in.
  await prisma.etsyShop.create({
    data: { userId: user.id, name: "My Etsy Shop", isActive: true, status: "disconnected" },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

/** Guard for server components / actions. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

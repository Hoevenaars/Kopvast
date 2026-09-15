"use server";

import { redirect } from "next/navigation";
import {
  changePassword,
  loginWithPassword,
  requestPasswordReset,
  requireSession,
  resetPasswordWithToken,
  startLogin,
} from "@/lib/auth";
export type LoginState = { ok: true; emailed: boolean } | { ok: false; message: string } | null;
export type PasswordState = { ok: true; message?: string } | { ok: false; message: string } | null;

export async function requestLogin(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const next = String(formData.get("next") ?? "");
  const intent = String(formData.get("intent") ?? "password");

  const result =
    intent === "link"
      ? await startLogin(email, next)
      : await loginWithPassword(email, String(formData.get("password") ?? ""), next);

  if (!result.ok) return result;
  if (result.destination) redirect(result.destination);
  return { ok: true, emailed: result.emailed };
}

export async function requestReset(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const result = await requestPasswordReset(String(formData.get("email") ?? ""));
  if (!result.ok) return result;
  if (result.destination) redirect(result.destination);
  return { ok: true, emailed: result.emailed };
}

export async function submitResetPassword(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const result = await resetPasswordWithToken(
    String(formData.get("token") ?? ""),
    String(formData.get("password") ?? ""),
    String(formData.get("confirm") ?? "")
  );
  if (!result.ok) return result;
  if (result.destination) redirect(result.destination);
  return { ok: true, emailed: false };
}

export async function saveAccountPassword(_previous: PasswordState, formData: FormData): Promise<PasswordState> {
  const session = await requireSession();
  if (!session) return { ok: false, message: "Je bent niet ingelogd." };
  const result = await changePassword({
    email: session.email,
    currentPassword: String(formData.get("currentPassword") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!result.ok) return result;
  return { ok: true, message: "Wachtwoord opgeslagen. Andere sessies zijn beëindigd." };
}

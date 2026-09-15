"use server";

import { redirect } from "next/navigation";
import {
  changePassword,
  loginWithPassword,
  requestPasswordReset,
  requireSession,
  resetPasswordWithCode,
  resetPasswordWithToken,
  startLogin,
  verifyLoginCode,
} from "@/lib/auth";

export type LoginState =
  | { ok: true; emailed: boolean; needsCode?: boolean; email?: string; devCode?: string }
  | { ok: false; message: string; needsCode?: boolean; email?: string; devCode?: string }
  | null;
export type PasswordState = { ok: true; message?: string } | { ok: false; message: string } | null;

export async function requestLogin(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const next = String(formData.get("next") ?? "");
  const intent = String(formData.get("intent") ?? "password");
  const keepCodeStep = formData.get("awaitingCode") === "1";

  const previousDevCode = _previous?.devCode;

  const result =
    intent === "code"
      ? await startLogin(email)
      : intent === "verify-code"
        ? await verifyLoginCode(email, String(formData.get("code") ?? ""), next)
        : await loginWithPassword(email, String(formData.get("password") ?? ""), next);

  if (!result.ok) {
    return {
      ...result,
      needsCode: Boolean(result.needsCode || keepCodeStep),
      email: result.email || email,
      devCode: result.devCode || previousDevCode,
    };
  }
  if (result.destination) redirect(result.destination);
  return {
    ok: true,
    emailed: result.emailed,
    needsCode: Boolean(result.needsCode || keepCodeStep),
    email: result.email || email,
    devCode: result.devCode || previousDevCode,
  };
}

export async function requestReset(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const result = await requestPasswordReset(String(formData.get("email") ?? ""));
  if (!result.ok) {
    return { ...result, devCode: result.devCode || _previous?.devCode };
  }
  if (result.destination) redirect(result.destination);
  return {
    ok: true,
    emailed: result.emailed,
    needsCode: result.needsCode,
    email: result.email,
    devCode: result.devCode,
  };
}

export async function submitResetPassword(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const token = String(formData.get("token") ?? "");
  const result = token
    ? await resetPasswordWithToken(
        token,
        String(formData.get("password") ?? ""),
        String(formData.get("confirm") ?? "")
      )
    : await resetPasswordWithCode(
        String(formData.get("email") ?? ""),
        String(formData.get("code") ?? ""),
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

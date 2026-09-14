"use server";

import { redirect } from "next/navigation";
import { startLogin } from "@/lib/auth";

export type LoginState = { ok: true; emailed: boolean } | { ok: false; message: string } | null;

export async function requestLogin(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const result = await startLogin(String(formData.get("email") ?? ""), String(formData.get("next") ?? ""));
  if (!result.ok) return result;
  if (result.destination) redirect(result.destination);
  return { ok: true, emailed: result.emailed };
}

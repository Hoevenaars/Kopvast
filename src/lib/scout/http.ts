export function jsonError(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

export function safeErrorMessage(error: unknown, fallback = "Er ging iets mis.") {
  if (error && typeof error === "object" && "status" in error && (error as { status?: number }).status === 401) {
    return "Niet ingelogd.";
  }
  if (error && typeof error === "object" && "status" in error && (error as { status?: number }).status === 403) {
    return "Geen toegang.";
  }
  return fallback;
}

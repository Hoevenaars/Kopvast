import { consumeRateLimit, rateLimitMessage } from "./rate-limit";
import { allowExpensiveSideEffects } from "./config";
import type { ScoutUser } from "./types";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export type CameraSuggestion = {
  companyName: string | null;
  website: string | null;
  text: string;
  confidence: "low" | "medium" | "high";
};

export async function interpretScoutPhoto(user: ScoutUser, file: File): Promise<{ ok: true; suggestion: CameraSuggestion } | { ok: false; message: string }> {
  const limited = await consumeRateLimit("upload", user.id);
  if (!limited.ok) return { ok: false, message: rateLimitMessage(limited.retryAfterSec) };

  const type = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(type)) {
    return { ok: false, message: "Alleen JPEG, PNG, WebP of HEIC zijn toegestaan." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "De foto is groter dan 8 MB." };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !allowExpensiveSideEffects()) {
    return {
      ok: true,
      suggestion: {
        companyName: null,
        website: null,
        text: "Foto ontvangen. Bevestig zelf welk bedrijf en welke website je wilt toevoegen. Er wordt niets automatisch gepusht.",
        confidence: "low",
      },
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const b64 = bytes.toString("base64");
  const mediaType = type === "image/heic" || type === "image/heif" ? "image/jpeg" : type;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Lees tekst van een foto van een gevel, bus, bord of visitekaartje. Verzin geen website. Als je geen URL ziet, laat website leeg. Antwoord JSON: {companyName, website, text, confidence}.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Welk bedrijf staat hier mogelijk op? Geen lead aanmaken." },
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${b64}` } },
            ],
          },
        ],
      }),
    });
    bytes.fill(0);
    if (!response.ok) return { ok: false, message: "De foto kon nu niet worden gelezen." };
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>) : {};
    return {
      ok: true,
      suggestion: {
        companyName: typeof parsed.companyName === "string" ? parsed.companyName : null,
        website: typeof parsed.website === "string" ? parsed.website : null,
        text: typeof parsed.text === "string" ? parsed.text : content.slice(0, 500),
        confidence: parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "low",
      },
    };
  } catch {
    return { ok: false, message: "De foto kon nu niet worden gelezen." };
  }
}

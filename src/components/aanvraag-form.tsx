"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AanvraagForm() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/aanvraag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          company: data.get("company"),
          website: data.get("website"),
          message: data.get("message"),
          source: params.get("website") ? "scan" : "aanvraag",
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Verzenden is niet gelukt.");
      }
      setStatus("success");
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Verzenden is niet gelukt.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-stone/60 bg-muted/40 p-8">
        <CheckCircle2 className="size-8 text-olive" />
        <h2 className="mt-4 font-heading text-3xl text-ink">Aanvraag ontvangen</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-olive">
          We hebben je bericht opgeslagen. Je hoort van ons op het opgegeven e-mailadres. Stilte
          behandelen we niet als akkoord of opdracht.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Naam</Label>
          <Input id="name" name="name" required className="h-11 bg-ivory" autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required className="h-11 bg-ivory" autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Bedrijf</Label>
          <Input id="company" name="company" className="h-11 bg-ivory" autoComplete="organization" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            defaultValue={params.get("website") ?? ""}
            placeholder="jouwbedrijf.nl"
            className="h-11 bg-ivory"
            autoComplete="url"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Wat speelt er?</Label>
        <Textarea
          id="message"
          name="message"
          rows={6}
          className="min-h-32 bg-ivory"
          placeholder="Bijvoorbeeld: onze locatiewebsite is onduidelijk, aanvragen komen verspreid binnen, of de huisstijl klopt niet overal."
        />
      </div>
      <p className="text-sm leading-6 text-olive">
        We gebruiken deze gegevens alleen om je aanvraag te behandelen. Geen nieuwsbrief, geen
        automatische opvolging.
      </p>
      {status === "error" ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" variant="copper" size="lg" disabled={status === "loading"}>
        {status === "loading" ? <LoaderCircle className="animate-spin" /> : null}
        Verstuur aanvraag
        <ArrowRight data-icon="inline-end" />
      </Button>
    </form>
  );
}

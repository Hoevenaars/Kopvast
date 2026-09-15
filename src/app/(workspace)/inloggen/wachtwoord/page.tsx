import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/workspace/forgot-password-form";
import { workspaceRoutes } from "@/lib/product";

export const metadata: Metadata = {
  title: "Wachtwoord vergeten",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <section className="container-page grid flex-1 items-start gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
      <div>
        <p className="text-xs tracking-[0.18em] text-olive uppercase">Beveiliging</p>
        <h1 className="font-heading mt-4 text-4xl leading-tight text-ink md:text-5xl">Wachtwoord vergeten</h1>
        <p className="mt-5 max-w-md text-base leading-7 text-olive">
          We sturen een code waarmee je een nieuw wachtwoord kiest. De code is twintig minuten geldig.
        </p>
      </div>
      <div>
        <ForgotPasswordForm />
        <p className="mt-4 text-sm text-olive">
          Terug naar{" "}
          <Link className="underline underline-offset-4" href={workspaceRoutes.login}>
            inloggen
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

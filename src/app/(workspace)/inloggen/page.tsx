import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/workspace/login-form";
import { allowDevLogin, readSession } from "@/lib/auth";
import { destinationForRole } from "@/lib/product";

export const metadata: Metadata = {
  title: "Inloggen",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fout?: string; wissel?: string }>;
}) {
  const session = await readSession();
  const params = await searchParams;
  if (session) redirect(params.next || destinationForRole(session.role));

  return (
    <section className="container-page grid flex-1 items-start gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
      <div>
        <p className="text-xs tracking-[0.18em] text-olive uppercase">Omgeving</p>
        <h1 className="font-heading mt-4 text-4xl leading-tight text-ink md:text-5xl">
          Inloggen bij Kopvast
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-olive">
          Log in met je wachtwoord. Lukt dat niet, dan sturen we een code naar je e-mail. Klanten
          komen in Mijn Kopvast, Kopvast in de Admin Console.
        </p>
      </div>
      <div>
        {params.wissel ? (
          <p className="mb-4 text-sm text-olive">Je bent uitgelogd. Log in met het account dat je wilt gebruiken.</p>
        ) : null}
        {params.fout ? (
          <p className="mb-4 text-sm text-destructive">Deze inlogcode is verlopen of al gebruikt.</p>
        ) : null}
        <LoginForm next={params.next} allowDev={allowDevLogin()} />
        <p className="mt-4 text-sm text-olive">
          Terug naar{" "}
          <Link className="underline underline-offset-4" href="/">
            kopvast.nl
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

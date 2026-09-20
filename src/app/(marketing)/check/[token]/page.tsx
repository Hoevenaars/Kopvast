import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicCheck } from "@/lib/commercial-handoffs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Jullie website",
  robots: { index: false, follow: false },
};

export default async function PublicCheckPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = await loadPublicCheck(token);
  if (!check) notFound();

  return (
    <section className="container-page max-w-3xl space-y-10 py-16 md:py-24">
      <div>
        <p className="text-xs tracking-[0.18em] text-olive uppercase">Kopvast</p>
        <h1 className="mt-3 text-4xl text-ink">{check.company}</h1>
        <p className="mt-2 text-sm text-olive">{check.website}</p>
      </div>

      {check.hasAnalysis ? (
        <div className="space-y-6">
          {check.observation ? (
            <div className="rounded-2xl border border-stone/50 bg-white p-6">
              <h2 className="text-sm font-semibold tracking-[0.14em] text-olive uppercase">Belangrijkste observatie</h2>
              <p className="mt-3 text-lg leading-8 text-ink">{check.observation}</p>
            </div>
          ) : null}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-[0.14em] text-olive uppercase">Wat opvalt</h2>
            {check.findings.map((finding) => (
              <article key={finding.title} className="rounded-2xl border border-stone/50 bg-[#f7f4ec] p-5">
                <h3 className="font-semibold text-ink">{finding.title}</h3>
                <p className="mt-2 text-sm leading-6 text-olive">{finding.description}</p>
              </article>
            ))}
          </div>
          <p className="text-sm leading-6 text-olive">
            Kopvast zou dit scherper maken: een herkenbare eerste indruk, een duidelijke route naar contact en een
            website die laat zien wat {check.company} waard is.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone/50 bg-[#f7f4ec] p-6">
          <h2 className="text-xl text-ink">We hebben jullie website ontvangen en technisch beoordeeld.</h2>
          <p className="mt-3 text-sm leading-6 text-olive">
            {check.scanFailed
              ? "De website was niet goed bereikbaar. De inhoudelijke beoordeling wordt nog afgerond."
              : "De inhoudelijke beoordeling wordt nog afgerond."}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={check.proposalHref}
          className="inline-flex h-12 items-center justify-center rounded-md bg-copper-dark px-5 text-sm text-ivory"
        >
          Doe me een voorstel
        </Link>
        <p className="self-center text-xs text-olive">{site.name} · geen extra formulier nodig</p>
      </div>
    </section>
  );
}

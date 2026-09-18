import { readScoutUser } from "@/lib/scout/auth";
import { scoutPublicBase, withBase } from "@/lib/scout/base-path";
import { ScoutLoginForm } from "@/components/scout/login-form";
import { redirect } from "next/navigation";

export default async function ScoutLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await readScoutUser();
  const base = await scoutPublicBase();
  const params = await searchParams;
  if (user) redirect(params.next || withBase(base, "/"));
  return (
    <main className="flex flex-1 flex-col justify-center">
      <p className="text-[11px] tracking-[0.28em] text-olive uppercase">Kopvast Scout</p>
      <h1 className="font-heading mt-4 text-4xl text-ink">Eén keer inloggen.</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-olive">
        Daarna open je Scout vanaf het beginscherm en push je een website in seconden. Geen code bij iedere push.
      </p>
      <div className="mt-8">
        <ScoutLoginForm next={params.next} />
      </div>
    </main>
  );
}

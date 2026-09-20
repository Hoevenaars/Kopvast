import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Mail, ScanSearch, Users, Workflow } from "lucide-react";
import { PageIntro } from "@/components/workspace/page-frame";
import { loadAcquisitionDashboard } from "@/lib/acquisition";
import { workspaceRoutes } from "@/lib/product";
import { listAdminScoutCaptures } from "@/lib/scout/crm";
import { SCOUT_STATUS_LABELS } from "@/lib/scout/types";
import { loadProposalTodayActions } from "@/lib/proposal-ops";
import { formatEuro } from "@/lib/sites";
import { loadBeheerOverview, loadOpenSupportActions } from "@/lib/workspace";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kopvast Today",
  robots: { index: false, follow: false },
};

export default async function AdminDashboard() {
  const [data, proposalActions, supportActions, beheer, scoutCaptures] = await Promise.all([
    loadAcquisitionDashboard(),
    loadProposalTodayActions(),
    loadOpenSupportActions(),
    loadBeheerOverview(),
    listAdminScoutCaptures(8),
  ]);
  const scoutActions = scoutCaptures.map((item) => ({
    title: "Scout-push",
    company: item.company_name || item.domain,
    status: SCOUT_STATUS_LABELS[item.status],
    age: scoutAge(item.created_at),
    href: item.prospect_id ? `${workspaceRoutes.adminAcquisition}/${item.prospect_id}` : workspaceRoutes.adminScout,
  }));
  const actions = [...scoutActions, ...proposalActions, ...supportActions, ...data.actions];
  const metrics = [
    { key: "prospects" as const, label: "Nieuwe prospects", value: String(data.metrics.prospects), icon: ScanSearch },
    { key: "scans" as const, label: "Scans", value: String(data.metrics.scans), icon: CheckCircle2 },
    { key: "sales" as const, label: "Sales ready", value: String(data.metrics.salesReady), icon: Users },
    { key: "support" as const, label: "Open support", value: String(supportActions.length), icon: Mail },
    { key: "mails" as const, label: "Mails verzonden", value: String(data.metrics.sent), icon: Workflow },
  ];
  const pipeline = [
    { label: "Nieuw", value: data.pipeline.nieuw },
    { label: "Qualified", value: data.pipeline.qualified },
    { label: "Sales ready", value: data.pipeline.salesReady },
    { label: "Verzonden", value: data.pipeline.verzonden },
    { label: "Response", value: data.pipeline.response },
  ];
  const healthy = data.metrics.errors === 0 && supportActions.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        eyebrow="Dashboard"
        title="Kopvast Today"
        text="Alleen wat vandaag aandacht nodig heeft."
        action={
          <Link
            href={workspaceRoutes.adminAcquisitionNew}
            className="inline-flex items-center justify-center rounded-md bg-ink px-4 py-3 text-sm font-semibold text-ivory transition hover:bg-ink/90"
          >
            + Prospect toevoegen
          </Link>
        }
      />

      <div className="flex flex-col gap-6 md:gap-8">
      <section className="order-2 grid gap-3 sm:grid-cols-2 md:order-1 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-2xl border border-ink/10 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-ink/45">{metric.label}</div>
                <Icon className="size-4 text-ink/30" />
              </div>
              <div className="mt-5 text-3xl font-semibold tracking-tight">{metric.value}</div>
            </div>
          );
        })}
      </section>

      <div className="order-1 grid gap-6 md:order-2 xl:grid-cols-[1.7fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
            <div>
              <h2 className="font-semibold">Actie nodig</h2>
              <p className="mt-0.5 text-xs text-ink/40">Uitzonderingen die menselijke aandacht vragen.</p>
            </div>
            <span className="rounded-full bg-ivory px-3 py-1 text-xs font-semibold">{actions.length}</span>
          </div>
          {actions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink/45">Niets dat nu wacht. Nieuwe scans, mails, voorstelvragen en support verschijnen hier.</p>
          ) : (
            <div className="divide-y divide-ink/6">
              {actions.map((action) => (
                <Link
                  key={`${action.href}-${action.company}-${action.title}-${action.age}`}
                  href={action.href}
                  className="grid w-full grid-cols-1 items-center gap-3 px-5 py-4 text-left transition hover:bg-[#F8F6F1] sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="text-sm font-semibold">{action.title}</div>
                    <div className="mt-1 text-xs text-ink/45">
                      {action.company} · {action.age}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge value={action.status} />
                    <ArrowUpRight className="size-4 text-ink/30" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-ink p-6 text-ivory">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-ivory/50">Acquisitie vandaag</div>
              <div className="mt-1 text-xl font-semibold">{healthy ? "Systeem gezond" : "Aandacht nodig"}</div>
            </div>
            <CheckCircle2 className="size-6 text-[#B9C6AB]" />
          </div>
          <div className="mt-8 space-y-5">
            <AutomationMetric label="Open support" value={String(supportActions.length)} warning={supportActions.length > 0} />
            <AutomationMetric label="Beheer-MRR" value={formatEuro(beheer.summary.mrr)} />
            <AutomationMetric label="Errors" value={String(data.metrics.errors)} warning={data.metrics.errors > 0} />
          </div>
        </section>
      </div>

      <section className="order-3 rounded-2xl border border-ink/10 bg-white p-5 md:p-6">
        <div>
          <h2 className="font-semibold">Acquisitiepipeline</h2>
          <p className="mt-1 text-sm text-ink/45">Van nieuwe website naar commerciële kans.</p>
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-2 md:grid-cols-5">
          {pipeline.map((stage) => (
            <div key={stage.label} className="rounded-md bg-ivory p-4">
              <div className="text-xs font-medium text-ink/45">{stage.label}</div>
              <div className="mt-3 text-2xl font-semibold">{stage.value}</div>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const warning = value === "Actie nodig" || value === "Beoordelen" || value === "Geblokkeerd" || value === "Open support";
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
        warning ? "bg-[#F3E4DD] text-copper-dark" : "bg-[#EDF0E9] text-olive"
      )}
    >
      {value}
    </span>
  );
}

function AutomationMetric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-ivory/10 pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-ivory/50">{label}</span>
      <span className={warning ? "font-semibold text-[#E0A98D]" : "font-semibold text-ivory"}>{value}</span>
    </div>
  );
}

function scoutAge(iso: string) {
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 24) return `${hours}u`;
  return `${Math.round(hours / 24)}d`;
}

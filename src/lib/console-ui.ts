/** Tijdelijke typed mockdata voor de UI-sprint. Later vervangen door Supabase. */

export type AdminMetric = {
  label: string;
  value: string;
  key: "prospects" | "scans" | "leads" | "mails" | "automations";
};

export type AdminAction = {
  title: string;
  company: string;
  status: string;
  age: string;
  href: string;
};

export type PipelineStage = {
  label: string;
  value: string;
};

export const adminTodayMock = {
  metrics: [
    { key: "prospects", label: "Nieuwe prospects", value: "8" },
    { key: "scans", label: "Websitechecks", value: "3" },
    { key: "leads", label: "Nieuwe leads", value: "2" },
    { key: "mails", label: "Mails verzonden", value: "12" },
    { key: "automations", label: "Automations", value: "18" },
  ] satisfies AdminMetric[],
  actions: [
    { title: "Prospect wacht op review", company: "Nova Advies", status: "Review", age: "2u", href: "/admin/prospects" },
    { title: "Website scan mislukt", company: "Studio Vale", status: "Actie nodig", age: "1d", href: "/admin/prospects" },
    { title: "Mail bounced", company: "De Praktijk", status: "Open", age: "1d", href: "/admin/mails" },
    { title: "Maatwerk prospect", company: "Karsten Events", status: "Beoordelen", age: "2d", href: "/admin/prospects" },
  ] satisfies AdminAction[],
  automations: {
    healthy: true,
    succeeded: "42",
    active: "3",
    failed: "1",
  },
  pipeline: [
    { label: "Nieuw", value: "18" },
    { label: "Qualified", value: "12" },
    { label: "Sales ready", value: "7" },
    { label: "Benaderbaar", value: "4" },
    { label: "Response", value: "2" },
  ] satisfies PipelineStage[],
};

export const customerHomeMock = {
  website: "jouwbedrijf.nl",
  status: "Live",
  updated: "14 september 2026",
  beheerActive: true,
  attention: [] as Array<{ title: string; href: string }>,
  recentChanges: [
    { title: "Homepage hero bijgewerkt", date: "14 september 2026", status: "Afgerond" },
  ],
};

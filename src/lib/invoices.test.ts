import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  billingDraftsForProjects,
  filterNewBillingDrafts,
  canCancel,
  canMarkInvoiced,
  canMarkPaid,
  displayInvoiceStatus,
  fieldsForInvoiced,
  formatEuro,
  parseAmountInput,
  hasUnsplitProjectInvoice,
  installmentDescription,
  installmentKindFromDescription,
  billingKindLabel,
  matchesInstallment,
  parseInvoiceInput,
  parseRecurringInput,
  paymentStatusForProject,
  recurringSummary,
  sortInvoices,
  splitInstallments,
} from "./invoices";


test("leidt OVERDUE af van gefactureerd + verstreken vervaldatum", () => {
  assert.equal(displayInvoiceStatus({ status: "INVOICED", due_date: "2026-09-01" }, "2026-09-16"), "OVERDUE");
  assert.equal(displayInvoiceStatus({ status: "INVOICED", due_date: "2026-09-16" }, "2026-09-16"), "INVOICED");
  assert.equal(displayInvoiceStatus({ status: "PAID", due_date: "2026-09-01" }, "2026-09-16"), "PAID");
  assert.equal(displayInvoiceStatus({ status: "NOT_INVOICED", due_date: "2026-09-01" }, "2026-09-16"), "NOT_INVOICED");
});

test("leest Nederlandse bedragen", () => {
  assert.equal(parseAmountInput("1.495"), 1495);
  assert.equal(parseAmountInput("€199"), 199);
  assert.equal(parseAmountInput("199,50"), 199.5);
  assert.equal(parseAmountInput("1.495,00"), 1495);
  assert.equal(parseAmountInput("1495.50"), 1495.5);
  assert.equal(parseAmountInput("0"), null);
  assert.equal(parseAmountInput(""), null);
});

test("bereidt NOT_INVOICED voor bij website en recurring bij beheer", () => {
  const drafts = billingDraftsForProjects(
    [
      { id: "p1", organization_id: "o1", type: "website", title: "Kopvast Website" },
      { id: "p2", organization_id: "o1", type: "beheer", title: "Kopvast Beheer" },
    ],
    "2026-09-16"
  );
  assert.equal(drafts.invoices.length, 1);
  assert.equal(drafts.invoices[0]?.amount_ex_vat, 1495);
  assert.equal(drafts.invoices[0]?.status, "NOT_INVOICED");
  assert.equal(drafts.invoices[0]?.project_id, "p1");
  assert.equal(drafts.recurring.length, 1);
  assert.equal(drafts.recurring[0]?.monthly_amount, 199);
  assert.equal(drafts.recurring[0]?.active, true);
  assert.equal(drafts.recurring[0]?.start_date, "2026-09-16");
});

test("zaait facturen niet opnieuw voor hetzelfde project", () => {
  const drafts = billingDraftsForProjects([
    { id: "p1", organization_id: "o1", type: "website", title: "Kopvast Website" },
    { id: "p2", organization_id: "o1", type: "beheer", title: "Kopvast Beheer" },
  ]);
  const filtered = filterNewBillingDrafts(drafts, {
    invoices: [{ project_id: "p1" }],
    recurring: [],
  });
  assert.equal(filtered.invoices.length, 0);
  assert.equal(filtered.recurring.length, 1);
  assert.equal(filtered.recurring[0]?.project_id, "p2");
});

test("maatwerk krijgt geen automatisch catalogusbedrag", () => {
  const drafts = billingDraftsForProjects([
    { id: "p3", organization_id: "o2", type: "maatwerk", title: "Maatwerk" },
  ]);
  assert.equal(drafts.invoices.length, 0);
  assert.equal(drafts.recurring.length, 0);
});

test("markeren als gefactureerd vult datum en vervaldatum", () => {
  const fields = fieldsForInvoiced({}, "2026-09-16");
  assert.equal(fields.status, "INVOICED");
  assert.equal(fields.invoice_date, "2026-09-16");
  assert.equal(fields.due_date, addDays("2026-09-16", 14));
  assert.equal(canMarkInvoiced("NOT_INVOICED"), true);
  assert.equal(canMarkPaid("INVOICED"), true);
  assert.equal(canMarkPaid("NOT_INVOICED"), false);
  assert.equal(canCancel("PAID"), false);
});

test("zet eurobedragen in NL-notatie", () => {
  assert.match(formatEuro(1495).replace(/\s/g, ""), /€1\.495,00|€1,495.00/);
});

test("sorteert te late facturen eerst", () => {
  const sorted = sortInvoices(
    [
      { status: "PAID", due_date: "2026-08-01", created_at: "2026-07-01" },
      { status: "INVOICED", due_date: "2026-09-01", created_at: "2026-08-20" },
      { status: "NOT_INVOICED", due_date: null, created_at: "2026-09-10" },
    ],
    "2026-09-16"
  );
  assert.equal(sorted[0]?.status, "INVOICED");
  assert.equal(sorted[1]?.status, "NOT_INVOICED");
  assert.equal(sorted[2]?.status, "PAID");
});

test("toont betaalstatus van de openstaande orderfactuur", () => {
  const status = paymentStatusForProject(
    [
      {
        id: "i1",
        organization_id: "o1",
        project_id: "p1",
        description: "Kopvast Website",
        amount_ex_vat: 1495,
        status: "INVOICED",
        invoice_number: "KV-1",
        invoice_date: "2026-08-01",
        due_date: "2026-08-15",
        external_reference: null,
        paid_at: null,
        created_at: "2026-08-01",
        updated_at: "2026-08-01",
      },
    ],
    "p1",
    "2026-09-16"
  );
  assert.equal(status, "OVERDUE");
});

test("telt actieve recurring omzet en beheerklanten", () => {
  const summary = recurringSummary([
    {
      id: "r1",
      organization_id: "o1",
      project_id: "p2",
      monthly_amount: 199,
      start_date: "2026-09-01",
      active: true,
      billing_notes: "Factureren op de 1e",
      created_at: "2026-09-01",
      updated_at: "2026-09-01",
    },
    {
      id: "r2",
      organization_id: "o2",
      project_id: null,
      monthly_amount: 199,
      start_date: "2026-08-01",
      active: false,
      billing_notes: null,
      created_at: "2026-08-01",
      updated_at: "2026-08-01",
    },
  ]);
  assert.equal(summary.monthlyTotal, 199);
  assert.equal(summary.customerCount, 1);
  assert.equal(summary.notes.length, 1);
});

test("splitst de afgesproken prijs 50/50 zonder afrondingsrest", () => {
  assert.deepEqual(splitInstallments(1495), { deposit: 747.5, final: 747.5 });
  assert.deepEqual(splitInstallments(995), { deposit: 497.5, final: 497.5 });
  assert.equal(splitInstallments(199).deposit + splitInstallments(199).final, 199);
  assert.equal(
    installmentDescription("Kopvast Website", "deposit"),
    "Kopvast Website — 50% bij opdrachtbevestiging"
  );
  assert.equal(installmentKindFromDescription("Kopvast Website — 50% na goedkeuring"), "final");
  assert.equal(billingKindLabel("Maatwerk — 50% bij opdrachtbevestiging"), "Aanbetaling");
  assert.equal(billingKindLabel("Maatwerk"), "Factuur");
  assert.equal(
    matchesInstallment(
      {
        organization_id: "o1",
        project_id: "p1",
        description: "Kopvast Website — 50% bij opdrachtbevestiging",
      },
      { organizationId: "o1", projectId: "p1", description: "Kopvast Website", kind: "deposit" }
    ),
    true
  );
  assert.equal(
    hasUnsplitProjectInvoice(
      [{ organization_id: "o1", project_id: "p1", description: "Kopvast Website" }],
      { organizationId: "o1", projectId: "p1", description: "Kopvast Website" }
    ),
    true
  );
  assert.equal(
    hasUnsplitProjectInvoice(
      [
        {
          organization_id: "o1",
          project_id: "p1",
          description: "Kopvast Website — 50% bij opdrachtbevestiging",
        },
      ],
      { organizationId: "o1", projectId: "p1", description: "Kopvast Website" }
    ),
    false
  );
});

test("valideert factuur- en recurringinvoer", () => {
  assert.equal(parseInvoiceInput({ organizationId: "", description: "Website", amount: "1495" }).ok, false);
  const invoice = parseInvoiceInput({
    organizationId: "o1",
    description: "Kopvast Website",
    amount: "1.495",
  });
  assert.equal(invoice.ok, true);
  if (invoice.ok) assert.equal(invoice.amount, 1495);
  assert.equal(parseRecurringInput({ organizationId: "o1", monthlyAmount: "199", startDate: "16-09-2026" }).ok, false);
  const recurring = parseRecurringInput({
    organizationId: "o1",
    monthlyAmount: "199",
    startDate: "2026-09-16",
    active: "on",
  });
  assert.equal(recurring.ok, true);
});

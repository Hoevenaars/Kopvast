import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TODO_BUCKETS,
  checklistStats,
  fieldsForDone,
  fieldsForProgress,
  formatDueShort,
  isOverdue,
  labelColor,
  moveBucket,
  newChecklistItem,
  nextBucketPosition,
  nextSortOrder,
  parseChecklist,
  relativeTimeNl,
  todosByBucket,
} from "./todos";

test("checklistStats telt afgeronde stappen", () => {
  assert.deepEqual(checklistStats(null), { total: 0, done: 0 });
  assert.deepEqual(
    checklistStats([
      { id: "a", title: "x", done: true },
      { id: "b", title: "y", done: false },
    ]),
    { total: 2, done: 1 }
  );
});

test("isOverdue negeert voltooide taken", () => {
  assert.equal(isOverdue("2026-08-01", "open", "2026-08-28"), true);
  assert.equal(isOverdue("2026-08-01", "done", "2026-08-28"), false);
  assert.equal(isOverdue("2026-09-01", "open", "2026-08-28"), false);
  assert.equal(isOverdue(null, "open", "2026-08-28"), false);
});

test("formatDueShort is dag-maand", () => {
  assert.equal(formatDueShort("2026-09-04"), "04-09");
  assert.equal(formatDueShort(""), "");
});

test("fieldsForProgress houdt status in sync", () => {
  const done = fieldsForDone(true);
  assert.equal(done.status, "done");
  assert.equal(done.progress, "voltooid");
  assert.ok(done.completed_at);
  const open = fieldsForProgress("bezig");
  assert.equal(open.status, "open");
  assert.equal(open.completed_at, null);
});

test("todosByBucket splitst niet-ingedeelde taken en sorteert", () => {
  const buckets = [{ id: "b1", name: "Nu", position: 0, created_at: "2026-01-01" }];
  const todos = [
    {
      id: "2",
      bucket_id: "b1",
      sort_order: 2,
      created_at: "2026-01-02",
      organization_id: null,
      title: "twee",
      due_at: null,
      start_at: null,
      priority: "normaal" as const,
      status: "open" as const,
      progress: "niet_gestart" as const,
      note: null,
      checklist: [],
      updated_at: "2026-01-02",
      completed_at: null,
      label_ids: [],
      company: null,
    },
    {
      id: "1",
      bucket_id: "b1",
      sort_order: 1,
      created_at: "2026-01-01",
      organization_id: null,
      title: "een",
      due_at: null,
      start_at: null,
      priority: "normaal" as const,
      status: "open" as const,
      progress: "niet_gestart" as const,
      note: null,
      checklist: [],
      updated_at: "2026-01-01",
      completed_at: null,
      label_ids: [],
      company: null,
    },
    {
      id: "x",
      bucket_id: null,
      sort_order: 0,
      created_at: "2026-01-03",
      organization_id: null,
      title: "los",
      due_at: null,
      start_at: null,
      priority: "normaal" as const,
      status: "open" as const,
      progress: "niet_gestart" as const,
      note: null,
      checklist: [],
      updated_at: "2026-01-03",
      completed_at: null,
      label_ids: [],
      company: null,
    },
  ];
  const { grouped, unassigned } = todosByBucket(todos, buckets);
  assert.deepEqual(grouped.get("b1")?.map((todo) => todo.id), ["1", "2"]);
  assert.deepEqual(unassigned.map((todo) => todo.id), ["x"]);
  assert.equal(nextSortOrder(grouped.get("b1")), 3);
});

test("newChecklistItem trimt de titel", () => {
  assert.deepEqual(newChecklistItem("  bel  ", "c1"), { id: "c1", title: "bel", done: false });
});

test("relativeTimeNl is compact Nederlands", () => {
  const now = new Date("2026-08-28T10:00:00");
  assert.equal(relativeTimeNl("2026-08-28T09:59:50", now), "zojuist");
  assert.equal(relativeTimeNl("2026-08-28T09:00:00", now), "1 uur geleden");
  assert.equal(relativeTimeNl("2026-08-27T10:00:00", now), "gisteren");
});

test("labelColor valt terug op pink", () => {
  assert.equal(labelColor("peach").bg, "#f5c9a8");
  assert.equal(labelColor("nope").id, "pink");
});

test("DEFAULT_TODO_BUCKETS volgt de Planner-volgorde", () => {
  assert.deepEqual([...DEFAULT_TODO_BUCKETS], [
    "Backlog",
    "Deze week / In Progress",
    "Volgende week",
    "Bewaking en beheer",
    "Optimalisaties",
    "Afgerond",
  ]);
});

test("nextBucketPosition is max plus een", () => {
  assert.equal(nextBucketPosition([]), 0);
  assert.equal(nextBucketPosition([{ position: 2 }, { position: 5 }]), 6);
});

test("moveBucket wisselt buren en hernummerd", () => {
  const buckets = [
    { id: "a", name: "A", position: 0, created_at: "2026-01-01" },
    { id: "b", name: "B", position: 1, created_at: "2026-01-01" },
    { id: "c", name: "C", position: 2, created_at: "2026-01-01" },
  ];
  assert.deepEqual(moveBucket(buckets, "b", -1), [
    { id: "b", position: 0 },
    { id: "a", position: 1 },
    { id: "c", position: 2 },
  ]);
  assert.equal(moveBucket(buckets, "a", -1), null);
  assert.equal(moveBucket(buckets, "c", 1), null);
});

test("parseChecklist slaat ongeldige rijen over", () => {
  assert.deepEqual(parseChecklist(null), []);
  assert.deepEqual(parseChecklist([{ id: "a", title: " stap ", done: 1 }, { title: "geen id" }]), [
    { id: "a", title: "stap", done: true },
  ]);
});

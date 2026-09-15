export const DEFAULT_TODO_BUCKETS = [
  "Backlog",
  "Deze week / In Progress",
  "Volgende week",
  "Bewaking en beheer",
  "Optimalisaties",
  "Afgerond",
] as const;

export const TODO_PROGRESS = [
  { id: "niet_gestart", label: "Niet gestart" },
  { id: "bezig", label: "Bezig" },
  { id: "voltooid", label: "Voltooid" },
] as const;

export const TODO_PRIORITIES = [
  { id: "laag", label: "Laag" },
  { id: "normaal", label: "Gemiddeld" },
  { id: "hoog", label: "Hoog" },
] as const;

export const TODO_LABEL_COLORS = [
  { id: "pink", bg: "#f4c2d7", fg: "#4a1730" },
  { id: "peach", bg: "#f5c9a8", fg: "#4a2410" },
  { id: "green", bg: "#c5e8b7", fg: "#1a3a12" },
  { id: "yellow", bg: "#f5e6a3", fg: "#3f3408" },
  { id: "blue", bg: "#b7d4f5", fg: "#122844" },
  { id: "purple", bg: "#d4c2f0", fg: "#2e1444" },
  { id: "teal", bg: "#b7ebe3", fg: "#123430" },
  { id: "gray", bg: "#d4d4d8", fg: "#1c1c20" },
] as const;

export type TodoProgress = (typeof TODO_PROGRESS)[number]["id"];
export type TodoPriority = (typeof TODO_PRIORITIES)[number]["id"];
export type TodoStatus = "open" | "done";
export type TodoLabelColor = (typeof TODO_LABEL_COLORS)[number]["id"];

export type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
};

export type TodoBucketRow = {
  id: string;
  name: string;
  position: number;
  created_at: string;
};

export type TodoLabelRow = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export type TodoLabelLinkRow = {
  todo_id: string;
  label_id: string;
};

export type TodoCommentRow = {
  id: string;
  todo_id: string;
  body: string;
  created_at: string;
};

export type TodoRow = {
  id: string;
  organization_id: string | null;
  bucket_id: string | null;
  title: string;
  due_at: string | null;
  start_at: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  progress: TodoProgress;
  note: string | null;
  sort_order: number;
  checklist: ChecklistItem[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type BoardTodo = TodoRow & {
  label_ids: string[];
  company: string | null;
};

export function isTodoProgress(value: string): value is TodoProgress {
  return TODO_PROGRESS.some((item) => item.id === value);
}

export function isTodoPriority(value: string): value is TodoPriority {
  return TODO_PRIORITIES.some((item) => item.id === value);
}

export function isTodoLabelColor(value: string): value is TodoLabelColor {
  return TODO_LABEL_COLORS.some((item) => item.id === value);
}

export function parseChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { id?: unknown; title?: unknown; done?: unknown };
      const id = String(row.id ?? "").trim();
      if (!id) return null;
      return { id, title: String(row.title ?? "").trim(), done: Boolean(row.done) };
    })
    .filter((item): item is ChecklistItem => Boolean(item));
}

export function labelColor(id: string | null | undefined) {
  return TODO_LABEL_COLORS.find((color) => color.id === id) ?? TODO_LABEL_COLORS[0];
}

export function checklistStats(checklist: ChecklistItem[] | null | undefined) {
  const items = Array.isArray(checklist) ? checklist : [];
  return { total: items.length, done: items.filter((item) => item.done).length };
}

export function todayIso(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isOverdue(dueAt: string | null | undefined, status: string, today: string) {
  if (!dueAt || status === "done") return false;
  return String(dueAt).slice(0, 10) < String(today);
}

export function formatDueShort(dueAt: string | null | undefined) {
  if (!dueAt) return "";
  const date = new Date(`${String(dueAt).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function fieldsForProgress(progress: string) {
  if (progress === "voltooid") {
    return { progress: "voltooid" as const, status: "done" as const, completed_at: new Date().toISOString() };
  }
  const next = isTodoProgress(progress) ? progress : "niet_gestart";
  return { progress: next, status: "open" as const, completed_at: null };
}

export function fieldsForDone(done: boolean) {
  return fieldsForProgress(done ? "voltooid" : "niet_gestart");
}

export function sortTodosInBucket(todos: BoardTodo[] | TodoRow[] | null | undefined) {
  return [...(todos || [])].sort(
    (a, b) =>
      (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
      String(a.created_at || "").localeCompare(String(b.created_at || ""))
  );
}

export function todosByBucket(todos: BoardTodo[], buckets: TodoBucketRow[]) {
  const grouped = new Map((buckets || []).map((bucket) => [bucket.id, [] as BoardTodo[]]));
  const unassigned: BoardTodo[] = [];
  for (const todo of todos || []) {
    if (todo.bucket_id && grouped.has(todo.bucket_id)) grouped.get(todo.bucket_id)!.push(todo);
    else unassigned.push(todo);
  }
  for (const [id, rows] of grouped) grouped.set(id, sortTodosInBucket(rows) as BoardTodo[]);
  return { grouped, unassigned: sortTodosInBucket(unassigned) as BoardTodo[] };
}

export function nextSortOrder(todos: { sort_order?: number }[] | null | undefined) {
  return (todos || []).reduce((max, todo) => Math.max(max, Number(todo.sort_order) || 0), 0) + 1;
}

export function nextBucketPosition(buckets: { position?: number }[] | null | undefined) {
  return (buckets || []).reduce((max, bucket) => Math.max(max, Number(bucket.position) || 0), -1) + 1;
}

export function moveBucket(buckets: TodoBucketRow[], id: string, dir: number) {
  const list = [...(buckets || [])];
  const from = list.findIndex((bucket) => bucket.id === id);
  const to = from + Number(dir);
  if (from < 0 || to < 0 || to >= list.length) return null;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.map((bucket, index) => ({ id: bucket.id, position: index }));
}

export function newChecklistItem(title: string, id?: string): ChecklistItem {
  return {
    id: id || crypto.randomUUID(),
    title: String(title || "").trim(),
    done: false,
  };
}

export function relativeTimeNl(iso: string | null | undefined, now = new Date()) {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const sec = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (sec < 45) return "zojuist";
  const min = Math.round(sec / 60);
  if (min < 60) return min === 1 ? "1 minuut geleden" : `${min} minuten geleden`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return hrs === 1 ? "1 uur geleden" : `${hrs} uur geleden`;
  const days = Math.round(hrs / 24);
  if (days < 7) return days === 1 ? "gisteren" : `${days} dagen geleden`;
  return then.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export function emptyDate(value: string | null | undefined) {
  const next = String(value ?? "").trim();
  return next ? next.slice(0, 10) : null;
}

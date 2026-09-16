import { refreshClient } from "@/lib/refresh";
import {
  DEFAULT_TODO_BUCKETS,
  emptyDate,
  fieldsForDone,
  fieldsForProgress,
  isTodoLabelColor,
  isTodoPriority,
  isTodoProgress,
  moveBucket,
  nextBucketPosition,
  nextSortOrder,
  parseChecklist,
  type BoardTodo,
  type ChecklistItem,
  type TodoBucketRow,
  type TodoCommentRow,
  type TodoLabelLinkRow,
  type TodoLabelRow,
  type TodoPriority,
  type TodoProgress,
  type TodoRow,
} from "@/lib/todos";
import { loadOrganizations } from "@/lib/workspace";
import { mutateStore, newId, nowIso, readStore } from "@/lib/workspace-store";

export type TodoBoardData = {
  buckets: TodoBucketRow[];
  labels: TodoLabelRow[];
  todos: BoardTodo[];
  organizations: Array<{ id: string; name: string }>;
};

export type TodoPatch = {
  title?: string;
  organization_id?: string | null;
  bucket_id?: string | null;
  due_at?: string | null;
  start_at?: string | null;
  priority?: string;
  progress?: string;
  note?: string | null;
  checklist?: ChecklistItem[];
};

export type ActionOk<T> = { ok: true } & T;
export type ActionErr = { ok: false; message: string };
export type ActionResult<T extends object = object> = ActionOk<T> | ActionErr;

function fail(message: string): ActionErr {
  return { ok: false, message };
}

function normalizeTodo(
  row: TodoRow & { checklist?: unknown; label_ids?: string[]; company?: string | null }
): BoardTodo {
  return {
    ...row,
    organization_id: row.organization_id || null,
    bucket_id: row.bucket_id || null,
    due_at: row.due_at || null,
    start_at: row.start_at || null,
    note: row.note || null,
    completed_at: row.completed_at || null,
    checklist: parseChecklist(row.checklist),
    label_ids: row.label_ids ?? [],
    company: row.company ?? null,
    priority: isTodoPriority(row.priority) ? row.priority : "normaal",
    progress: isTodoProgress(row.progress) ? row.progress : "niet_gestart",
    status: row.status === "done" ? "done" : "open",
  };
}

function attachTodos(
  todos: Array<TodoRow & { checklist?: unknown }>,
  links: TodoLabelLinkRow[],
  organizations: Array<{ id: string; name: string }>
): BoardTodo[] {
  const names = new Map(organizations.map((org) => [org.id, org.name]));
  const byTodo = new Map<string, string[]>();
  for (const link of links) {
    const current = byTodo.get(link.todo_id) ?? [];
    current.push(link.label_id);
    byTodo.set(link.todo_id, current);
  }
  return todos.map((todo) =>
    normalizeTodo({
      ...todo,
      label_ids: byTodo.get(todo.id) ?? [],
      company: todo.organization_id ? names.get(todo.organization_id) ?? null : null,
    })
  );
}

async function ensureDefaultBuckets() {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_todo_buckets").select("id").limit(1);
    if (data?.length) return;
    await supabase.from("kopvast_todo_buckets").insert(
      DEFAULT_TODO_BUCKETS.map((name, position) => ({ name, position }))
    );
    return;
  }
  await mutateStore((store) => {
    if (store.todoBuckets.length) return;
    const created = nowIso();
    store.todoBuckets = DEFAULT_TODO_BUCKETS.map((name, position) => ({
      id: newId(),
      name,
      position,
      created_at: created,
    }));
  });
}

export async function loadTodoBoard(): Promise<TodoBoardData> {
  await ensureDefaultBuckets();
  const organizations = (await loadOrganizations()).map((org) => ({ id: org.id, name: org.name }));
  const supabase = refreshClient();
  if (supabase) {
    const [buckets, labels, todos, links] = await Promise.all([
      supabase.from("kopvast_todo_buckets").select("*").order("position").order("created_at"),
      supabase.from("kopvast_todo_labels").select("*").order("created_at"),
      supabase.from("kopvast_todos").select("*").order("sort_order").order("created_at"),
      supabase.from("kopvast_todo_label_links").select("*"),
    ]);
    return {
      buckets: (buckets.data ?? []) as TodoBucketRow[],
      labels: (labels.data ?? []) as TodoLabelRow[],
      todos: attachTodos((todos.data ?? []) as TodoRow[], (links.data ?? []) as TodoLabelLinkRow[], organizations),
      organizations,
    };
  }
  const store = await readStore();
  const buckets = [...store.todoBuckets].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)
  );
  return {
    buckets,
    labels: [...store.todoLabels],
    todos: attachTodos(store.todos, store.todoLabelLinks, organizations),
    organizations,
  };
}

export async function loadTodoComments(todoId: string): Promise<TodoCommentRow[]> {
  if (!todoId) return [];
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase
      .from("kopvast_todo_comments")
      .select("*")
      .eq("todo_id", todoId)
      .order("created_at");
    return (data ?? []) as TodoCommentRow[];
  }
  return (await readStore()).todoComments
    .filter((item) => item.todo_id === todoId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

async function findTodo(id: string) {
  const supabase = refreshClient();
  if (supabase) {
    const { data } = await supabase.from("kopvast_todos").select("*").eq("id", id).maybeSingle();
    return (data as TodoRow | null) ?? null;
  }
  return (await readStore()).todos.find((item) => item.id === id) ?? null;
}

async function peersInBucket(bucketId: string | null, exceptId?: string) {
  const supabase = refreshClient();
  if (supabase) {
    let query = supabase.from("kopvast_todos").select("id, sort_order");
    query = bucketId ? query.eq("bucket_id", bucketId) : query.is("bucket_id", null);
    const { data } = await query;
    return ((data ?? []) as Array<{ id: string; sort_order: number }>).filter((row) => row.id !== exceptId);
  }
  return (await readStore()).todos.filter(
    (item) => (item.bucket_id || null) === (bucketId || null) && item.id !== exceptId
  );
}

export async function createTodo(input: {
  title: string;
  bucket_id?: string | null;
  organization_id?: string | null;
  due_at?: string | null;
  note?: string | null;
  priority?: string;
}): Promise<ActionResult<{ todo: BoardTodo }>> {
  const title = input.title.trim();
  if (title.length < 1) return fail("Geef een taaknaam.");
  if (input.priority && !isTodoPriority(input.priority)) return fail("Onbekende prioriteit.");
  const bucketId = input.bucket_id || null;
  const organizationId = input.organization_id || null;
  const sortOrder = nextSortOrder(await peersInBucket(bucketId));
  const row = {
    title,
    bucket_id: bucketId,
    organization_id: organizationId,
    due_at: emptyDate(input.due_at),
    start_at: null,
    priority: (isTodoPriority(input.priority ?? "") ? input.priority : "normaal") as TodoPriority,
    status: "open" as const,
    progress: "niet_gestart" as TodoProgress,
    note: input.note?.trim() || null,
    sort_order: sortOrder,
    checklist: [] as ChecklistItem[],
    completed_at: null,
  };
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase.from("kopvast_todos").insert(row).select("*").single();
    if (error || !data) {
      console.error("[kopvast] Taak aanmaken mislukt", error?.message);
      return fail("Taak opslaan is tijdelijk niet beschikbaar.");
    }
    const board = await loadTodoBoard();
    const todo = board.todos.find((item) => item.id === data.id);
    return { ok: true, todo: todo ?? normalizeTodo(data as TodoRow) };
  }
  const created = await mutateStore((store) => {
    const todo: TodoRow = { ...row, id: newId(), created_at: nowIso(), updated_at: nowIso() };
    store.todos.push(todo);
    return todo;
  });
  const board = await loadTodoBoard();
  return { ok: true, todo: board.todos.find((item) => item.id === created.id) ?? normalizeTodo(created) };
}

export async function updateTodo(id: string, patch: TodoPatch): Promise<ActionResult<{ todo: BoardTodo }>> {
  if (!id) return fail("Taak ontbreekt.");
  const current = await findTodo(id);
  if (!current) return fail("Taak niet gevonden.");
  const next: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (title.length < 1) return fail("Geef een taaknaam.");
    next.title = title;
  }
  if (patch.organization_id !== undefined) next.organization_id = patch.organization_id || null;
  if (patch.bucket_id !== undefined) next.bucket_id = patch.bucket_id || null;
  if (patch.due_at !== undefined) next.due_at = emptyDate(patch.due_at);
  if (patch.start_at !== undefined) next.start_at = emptyDate(patch.start_at);
  if (patch.note !== undefined) next.note = patch.note?.trim() || null;
  if (patch.checklist !== undefined) next.checklist = parseChecklist(patch.checklist);
  if (patch.priority !== undefined) {
    if (!isTodoPriority(patch.priority)) return fail("Onbekende prioriteit.");
    next.priority = patch.priority;
  }
  if (patch.progress !== undefined) {
    if (!isTodoProgress(patch.progress)) return fail("Onbekende status.");
    Object.assign(next, fieldsForProgress(patch.progress));
  }
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_todos").update(next).eq("id", id);
    if (error) {
      console.error("[kopvast] Taak bijwerken mislukt", error.message);
      return fail("Taak opslaan is tijdelijk niet beschikbaar.");
    }
  } else {
    await mutateStore((store) => {
      const todo = store.todos.find((item) => item.id === id);
      if (!todo) return;
      Object.assign(todo, next);
    });
  }
  const board = await loadTodoBoard();
  const todo = board.todos.find((item) => item.id === id);
  if (!todo) return fail("Taak niet gevonden.");
  return { ok: true, todo };
}

export async function toggleTodoDone(id: string): Promise<ActionResult<{ todo: BoardTodo }>> {
  const current = await findTodo(id);
  if (!current) return fail("Taak niet gevonden.");
  return updateTodo(id, { progress: fieldsForDone(current.status !== "done").progress });
}

export async function moveTodo(id: string, bucketId: string | null): Promise<ActionResult<{ todo: BoardTodo }>> {
  if (!id) return fail("Taak ontbreekt.");
  const sortOrder = nextSortOrder(await peersInBucket(bucketId, id));
  const supabase = refreshClient();
  const patch = { bucket_id: bucketId || null, sort_order: sortOrder, updated_at: nowIso() };
  if (supabase) {
    const { error } = await supabase.from("kopvast_todos").update(patch).eq("id", id);
    if (error) return fail("Verplaatsen is tijdelijk niet beschikbaar.");
  } else {
    await mutateStore((store) => {
      const todo = store.todos.find((item) => item.id === id);
      if (!todo) return;
      Object.assign(todo, patch);
    });
  }
  const board = await loadTodoBoard();
  const todo = board.todos.find((item) => item.id === id);
  if (!todo) return fail("Taak niet gevonden.");
  return { ok: true, todo };
}

export async function deleteTodo(id: string): Promise<ActionResult> {
  if (!id) return fail("Taak ontbreekt.");
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_todos").delete().eq("id", id);
    if (error) return fail("Verwijderen is tijdelijk niet beschikbaar.");
    return { ok: true };
  }
  await mutateStore((store) => {
    store.todos = store.todos.filter((item) => item.id !== id);
    store.todoLabelLinks = store.todoLabelLinks.filter((item) => item.todo_id !== id);
    store.todoComments = store.todoComments.filter((item) => item.todo_id !== id);
  });
  return { ok: true };
}

export async function createBucket(name: string): Promise<ActionResult<{ bucket: TodoBucketRow }>> {
  const trimmed = name.trim();
  if (!trimmed) return fail("Geef een kolomnaam.");
  const board = await loadTodoBoard();
  const row = { name: trimmed, position: nextBucketPosition(board.buckets) };
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase.from("kopvast_todo_buckets").insert(row).select("*").single();
    if (error || !data) return fail("Kolom opslaan is tijdelijk niet beschikbaar.");
    return { ok: true, bucket: data as TodoBucketRow };
  }
  const bucket = await mutateStore((store) => {
    const created: TodoBucketRow = { ...row, id: newId(), created_at: nowIso() };
    store.todoBuckets.push(created);
    return created;
  });
  return { ok: true, bucket };
}

export async function renameBucket(id: string, name: string): Promise<ActionResult<{ bucket: TodoBucketRow }>> {
  const trimmed = name.trim();
  if (!id) return fail("Kolom ontbreekt.");
  if (!trimmed) return fail("Geef een kolomnaam.");
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("kopvast_todo_buckets")
      .update({ name: trimmed })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) return fail("Kolom hernoemen is tijdelijk niet beschikbaar.");
    return { ok: true, bucket: data as TodoBucketRow };
  }
  const bucket = await mutateStore((store) => {
    const current = store.todoBuckets.find((item) => item.id === id);
    if (!current) return null;
    current.name = trimmed;
    return current;
  });
  if (!bucket) return fail("Kolom niet gevonden.");
  return { ok: true, bucket };
}

export async function reorderBucket(id: string, dir: number): Promise<ActionResult<{ buckets: TodoBucketRow[] }>> {
  const board = await loadTodoBoard();
  const updates = moveBucket(board.buckets, id, dir);
  if (!updates) return fail("Kolom kan niet verder.");
  const supabase = refreshClient();
  if (supabase) {
    for (const update of updates) {
      const { error } = await supabase.from("kopvast_todo_buckets").update({ position: update.position }).eq("id", update.id);
      if (error) return fail("Volgorde opslaan is tijdelijk niet beschikbaar.");
    }
  } else {
    await mutateStore((store) => {
      for (const update of updates) {
        const bucket = store.todoBuckets.find((item) => item.id === update.id);
        if (bucket) bucket.position = update.position;
      }
    });
  }
  return { ok: true, buckets: (await loadTodoBoard()).buckets };
}

export async function deleteBucket(id: string): Promise<ActionResult> {
  if (!id) return fail("Kolom ontbreekt.");
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_todo_buckets").delete().eq("id", id);
    if (error) return fail("Kolom verwijderen is tijdelijk niet beschikbaar.");
    return { ok: true };
  }
  await mutateStore((store) => {
    store.todoBuckets = store.todoBuckets.filter((item) => item.id !== id);
    for (const todo of store.todos) {
      if (todo.bucket_id === id) todo.bucket_id = null;
    }
  });
  return { ok: true };
}

export async function createLabel(name: string, color: string): Promise<ActionResult<{ label: TodoLabelRow }>> {
  const trimmed = name.trim();
  if (!trimmed) return fail("Geef een labelnaam.");
  const nextColor = isTodoLabelColor(color) ? color : "pink";
  const row = { name: trimmed, color: nextColor };
  const supabase = refreshClient();
  if (supabase) {
    const { data, error } = await supabase.from("kopvast_todo_labels").insert(row).select("*").single();
    if (error || !data) return fail("Label opslaan is tijdelijk niet beschikbaar.");
    return { ok: true, label: data as TodoLabelRow };
  }
  const label = await mutateStore((store) => {
    const created: TodoLabelRow = { ...row, id: newId(), created_at: nowIso() };
    store.todoLabels.push(created);
    return created;
  });
  return { ok: true, label };
}

export async function deleteLabel(id: string): Promise<ActionResult> {
  if (!id) return fail("Label ontbreekt.");
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_todo_labels").delete().eq("id", id);
    if (error) return fail("Label verwijderen is tijdelijk niet beschikbaar.");
    return { ok: true };
  }
  await mutateStore((store) => {
    store.todoLabels = store.todoLabels.filter((item) => item.id !== id);
    store.todoLabelLinks = store.todoLabelLinks.filter((item) => item.label_id !== id);
  });
  return { ok: true };
}

export async function setTodoLabels(todoId: string, labelIds: string[]): Promise<ActionResult<{ todo: BoardTodo }>> {
  if (!todoId) return fail("Taak ontbreekt.");
  const unique = [...new Set(labelIds.filter(Boolean))];
  const supabase = refreshClient();
  if (supabase) {
    const { error: delErr } = await supabase.from("kopvast_todo_label_links").delete().eq("todo_id", todoId);
    if (delErr) return fail("Labels bijwerken is tijdelijk niet beschikbaar.");
    if (unique.length) {
      const { error } = await supabase
        .from("kopvast_todo_label_links")
        .insert(unique.map((label_id) => ({ todo_id: todoId, label_id })));
      if (error) return fail("Labels bijwerken is tijdelijk niet beschikbaar.");
    }
  } else {
    await mutateStore((store) => {
      store.todoLabelLinks = store.todoLabelLinks.filter((item) => item.todo_id !== todoId);
      for (const label_id of unique) store.todoLabelLinks.push({ todo_id: todoId, label_id });
    });
  }
  const board = await loadTodoBoard();
  const todo = board.todos.find((item) => item.id === todoId);
  if (!todo) return fail("Taak niet gevonden.");
  return { ok: true, todo };
}

export async function addTodoComment(todoId: string, body: string): Promise<ActionResult<{ comments: TodoCommentRow[] }>> {
  const text = body.trim();
  if (!todoId) return fail("Taak ontbreekt.");
  if (!text) return fail("Typ een bericht.");
  const supabase = refreshClient();
  if (supabase) {
    const { error } = await supabase.from("kopvast_todo_comments").insert({ todo_id: todoId, body: text });
    if (error) return fail("Bericht opslaan is tijdelijk niet beschikbaar.");
  } else {
    await mutateStore((store) => {
      store.todoComments.push({
        id: newId(),
        todo_id: todoId,
        body: text,
        created_at: nowIso(),
      });
    });
  }
  return { ok: true, comments: await loadTodoComments(todoId) };
}

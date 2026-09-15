"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  createBucketAction,
  createLabelAction,
  createTodoAction,
  deleteBucketAction,
  deleteLabelAction,
  moveTodoAction,
  renameBucketAction,
  reorderBucketAction,
  toggleTodoDoneAction,
} from "@/app/(workspace)/admin/taken/actions";
import { TaskPanel } from "@/components/workspace/task-panel";
import {
  TODO_LABEL_COLORS,
  checklistStats,
  formatDueShort,
  isOverdue,
  labelColor,
  todayIso,
  todosByBucket,
  type BoardTodo,
  type TodoBucketRow,
  type TodoLabelColor,
  type TodoLabelRow,
} from "@/lib/todos";
import { cn } from "@/lib/utils";

type OrganizationOption = { id: string; name: string };

export function TaskBoard({
  initialBuckets,
  initialLabels,
  initialTodos,
  organizations,
}: {
  initialBuckets: TodoBucketRow[];
  initialLabels: TodoLabelRow[];
  initialTodos: BoardTodo[];
  organizations: OrganizationOption[];
}) {
  const [buckets, setBuckets] = useState(initialBuckets);
  const [labels, setLabels] = useState(initialLabels);
  const [todos, setTodos] = useState(initialTodos);
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [expandedDone, setExpandedDone] = useState<Set<string>>(new Set());
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overBucket, setOverBucket] = useState<string | null>(null);
  const drag = useRef<{ id: string; x: number; y: number; started: boolean } | null>(null);
  const overRef = useRef<string | null>(null);
  const skipClick = useRef(false);

  const { grouped, unassigned } = todosByBucket(todos, buckets);
  const columns: Array<{ id: string; name: string; fake: boolean; todos: BoardTodo[] }> = [];
  if (unassigned.length) columns.push({ id: "", name: "Niet ingedeeld", fake: true, todos: unassigned });
  for (const bucket of buckets) columns.push({ id: bucket.id, name: bucket.name, fake: false, todos: grouped.get(bucket.id) || [] });

  const openTodo = todos.find((todo) => todo.id === openTodoId) ?? null;
  const openCount = todos.filter((todo) => todo.status !== "done").length;

  function replaceTodo(next: BoardTodo) {
    setTodos((current) => {
      const exists = current.some((todo) => todo.id === next.id);
      return exists ? current.map((todo) => (todo.id === next.id ? next : todo)) : [...current, next];
    });
  }

  function report(message: string) {
    setError(message);
  }

  function markOver(bucketId: string | null) {
    overRef.current = bucketId;
    setOverBucket(bucketId);
  }

  async function dropOn(bucketId: string, todoId?: string) {
    const id = todoId || drag.current?.id || draggingId;
    drag.current = null;
    markOver(null);
    setDraggingId(null);
    if (!id) return;
    const result = await moveTodoAction(id, bucketId || null);
    if (!result.ok) return report(result.message);
    replaceTodo(result.todo);
  }

  function finishPointerDrag() {
    const state = drag.current;
    if (!state?.started) {
      drag.current = null;
      setDraggingId(null);
      return;
    }
    skipClick.current = true;
    window.setTimeout(() => {
      skipClick.current = false;
    }, 200);
    const target = overRef.current;
    if (target == null) {
      drag.current = null;
      setDraggingId(null);
      return;
    }
    void dropOn(target, state.id);
  }

  function onCardPointerDown(event: PointerEvent<HTMLElement>, todoId: string) {
    if ((event.target as HTMLElement).closest("[data-toggle]")) return;
    const pointerId = event.pointerId;
    drag.current = { id: todoId, x: event.clientX, y: event.clientY, started: false };

    const hitTest = (clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY);
      const col = el?.closest("[data-bucket]") as HTMLElement | null;
      markOver(col ? (col.dataset.bucket ?? "") : null);
    };

    const onMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const state = drag.current;
      if (!state) return;
      const dist = Math.hypot(moveEvent.clientX - state.x, moveEvent.clientY - state.y);
      if (!state.started && dist > 6) {
        state.started = true;
        skipClick.current = true;
        setDraggingId(state.id);
      }
      if (!state.started) return;
      hitTest(moveEvent.clientX, moveEvent.clientY);
    };

    const onUp = (upEvent: globalThis.PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      hitTest(upEvent.clientX, upEvent.clientY);
      finishPointerDrag();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-ink/45">{openCount === 1 ? "1 open" : `${openCount} open`}</p>
        <button
          type="button"
          onClick={() => setLabelsOpen(true)}
          className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-medium hover:bg-ivory"
        >
          Labels
        </button>
        <button
          type="button"
          onClick={() => setColumnsOpen(true)}
          className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-medium hover:bg-ivory"
        >
          Kolommen
        </button>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex min-h-[calc(100dvh-16rem)] flex-1 gap-3 overflow-x-auto pb-4">
        {columns.map((column) => {
          const open = column.todos.filter((todo) => todo.status !== "done");
          const done = column.todos.filter((todo) => todo.status === "done");
          const key = column.id || "__none__";
          const showDone = expandedDone.has(key);
          return (
            <section
              key={key}
              data-bucket={column.id}
              onDragOver={(event) => {
                event.preventDefault();
                markOver(column.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain") || draggingId;
                if (!id) return;
                void dropOn(column.id, id);
              }}
              className={cn(
                "flex w-[280px] shrink-0 flex-col gap-2 rounded-2xl p-2",
                overBucket === column.id ? "bg-olive/10" : "bg-white/55"
              )}
            >
              <header className="flex items-center gap-2 px-1">
                {column.fake ? (
                  <h2 className="flex-1 text-sm font-semibold">{column.name}</h2>
                ) : (
                  <input
                    className="h-8 flex-1 bg-transparent text-sm font-semibold outline-none"
                    defaultValue={column.name}
                    aria-label="Kolomnaam"
                    onBlur={async (event) => {
                      const name = event.currentTarget.value.trim();
                      if (!name || name === column.name) {
                        event.currentTarget.value = column.name;
                        return;
                      }
                      const result = await renameBucketAction(column.id, name);
                      if (!result.ok) {
                        event.currentTarget.value = column.name;
                        return report(result.message);
                      }
                      setBuckets((current) => current.map((bucket) => (bucket.id === column.id ? result.bucket : bucket)));
                    }}
                  />
                )}
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink/45">{open.length}</span>
              </header>
              {column.fake ? (
                <p className="px-1 text-xs text-ink/40">Sleep naar een kolom.</p>
              ) : addingIn === column.id ? (
                <NewTaskInput
                  onCancel={() => setAddingIn(null)}
                  onCreate={async (title) => {
                    const result = await createTodoAction({ title, bucketId: column.id });
                    if (!result.ok) return report(result.message);
                    replaceTodo(result.todo);
                    setAddingIn(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingIn(column.id)}
                  className="rounded-md px-3 py-2 text-left text-sm text-ink/45 hover:bg-white hover:text-ink"
                >
                  + Taak toevoegen
                </button>
              )}
              <div className="flex min-h-24 flex-1 flex-col gap-2 rounded-xl p-1">
                {open.map((todo) => (
                  <TaskCard
                    key={todo.id}
                    todo={todo}
                    labels={labels}
                    dragging={draggingId === todo.id}
                    onOpen={() => {
                      if (skipClick.current) {
                        skipClick.current = false;
                        return;
                      }
                      setOpenTodoId(todo.id);
                    }}
                    onPointerDown={(event) => onCardPointerDown(event, todo.id)}
                    onToggle={async () => {
                      const result = await toggleTodoDoneAction(todo.id);
                      if (!result.ok) return report(result.message);
                      replaceTodo(result.todo);
                    }}
                  />
                ))}
                {!open.length && !done.length ? <p className="px-2 py-3 text-xs text-ink/35">Nog geen taken</p> : null}
              </div>
              {done.length ? (
                <>
                  <button
                    type="button"
                    className="px-2 py-1 text-left text-xs text-ink/45 hover:text-ink"
                    onClick={() => {
                      setExpandedDone((current) => {
                        const next = new Set(current);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      });
                    }}
                  >
                    Voltooide taken {done.length}
                  </button>
                  {showDone ? (
                    <div className="flex flex-col gap-2 rounded-xl p-1">
                      {done.map((todo) => (
                        <TaskCard
                          key={todo.id}
                          todo={todo}
                          labels={labels}
                          dragging={draggingId === todo.id}
                          onOpen={() => {
                            if (skipClick.current) {
                              skipClick.current = false;
                              return;
                            }
                            setOpenTodoId(todo.id);
                          }}
                          onPointerDown={(event) => onCardPointerDown(event, todo.id)}
                          onToggle={async () => {
                            const result = await toggleTodoDoneAction(todo.id);
                            if (!result.ok) return report(result.message);
                            replaceTodo(result.todo);
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </section>
          );
        })}
        <section className="flex w-[260px] shrink-0 flex-col gap-2">
          {addingColumn ? (
            <NewColumnInput
              onCancel={() => setAddingColumn(false)}
              onCreate={async (name) => {
                const result = await createBucketAction(name);
                if (!result.ok) return report(result.message);
                setBuckets((current) => [...current, result.bucket]);
                setAddingColumn(false);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingColumn(true)}
              className="rounded-xl border border-dashed border-ink/15 px-3 py-3 text-left text-sm text-ink/45 hover:border-ink/30 hover:bg-white hover:text-ink"
            >
              + Kolom toevoegen
            </button>
          )}
        </section>
      </div>

      {openTodo ? (
        <TaskPanel
          todo={openTodo}
          buckets={buckets}
          labels={labels}
          organizations={organizations}
          onClose={() => setOpenTodoId(null)}
          onTodo={replaceTodo}
          onDeleted={(id) => {
            setTodos((current) => current.filter((todo) => todo.id !== id));
            setOpenTodoId(null);
          }}
          onError={report}
        />
      ) : null}

      {labelsOpen ? (
        <LabelsDialog
          labels={labels}
          onClose={() => setLabelsOpen(false)}
          onCreated={(label) => setLabels((current) => [...current, label])}
          onDeleted={(id) => {
            setLabels((current) => current.filter((label) => label.id !== id));
            setTodos((current) =>
              current.map((todo) => ({ ...todo, label_ids: todo.label_ids.filter((labelId) => labelId !== id) }))
            );
          }}
          onError={report}
        />
      ) : null}

      {columnsOpen ? (
        <ColumnsDialog
          buckets={buckets}
          todos={todos}
          onClose={() => setColumnsOpen(false)}
          onBuckets={setBuckets}
          onTodos={setTodos}
          onError={report}
        />
      ) : null}
    </div>
  );
}

function TaskCard({
  todo,
  labels,
  dragging,
  onOpen,
  onToggle,
  onPointerDown,
}: {
  todo: BoardTodo;
  labels: TodoLabelRow[];
  dragging: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
}) {
  const assigned = todo.label_ids.map((id) => labels.find((label) => label.id === id)).filter(Boolean) as TodoLabelRow[];
  const stats = checklistStats(todo.checklist);
  const due = formatDueShort(todo.due_at);
  const overdue = isOverdue(todo.due_at, todo.status, todayIso());
  const done = todo.status === "done";

  return (
    <article
      draggable
      onPointerDown={onPointerDown}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", todo.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      className={cn(
        "cursor-grab touch-none rounded-xl border border-ink/10 bg-white p-3 shadow-[0_1px_0_rgba(18,18,18,0.04)] select-none",
        dragging && "pointer-events-none opacity-40",
        done && "opacity-70"
      )}
    >
      {assigned.length ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {assigned.map((label) => {
            const color = labelColor(label.color);
            return (
              <span
                key={label.id}
                className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                style={{ background: color.bg, color: color.fg }}
              >
                {label.name}
              </span>
            );
          })}
        </div>
      ) : null}
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          className={cn("mt-0.5 size-4 shrink-0 rounded-full border-2", done ? "border-olive bg-olive" : "border-stone bg-transparent")}
          data-toggle
          aria-label={done ? "Heropenen" : "Afronden"}
        />
        <p className={cn("text-sm font-medium leading-5", done && "text-ink/45 line-through")}>{todo.title}</p>
      </div>
      {due || stats.total || todo.company ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink/45">
          {due ? (
            <span className={cn("rounded px-1.5 py-0.5", overdue && "bg-[#F3E4DD] font-semibold text-copper-dark")}>{due}</span>
          ) : null}
          {stats.total ? (
            <span>
              {stats.done}/{stats.total}
            </span>
          ) : null}
          {todo.company ? <span>{todo.company}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

function NewTaskInput({ onCancel, onCreate }: { onCancel: () => void; onCreate: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="rounded-xl border border-copper/40 bg-white p-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const next = title.trim();
        if (!next || pending) return;
        setPending(true);
        await onCreate(next);
        setPending(false);
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        onBlur={() => {
          if (!title.trim()) onCancel();
        }}
        placeholder="Taaknaam"
        className="h-9 w-full bg-transparent px-1 text-sm outline-none"
      />
    </form>
  );
}

function NewColumnInput({ onCancel, onCreate }: { onCancel: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const saving = useRef(false);
  async function save() {
    const next = name.trim();
    if (!next || saving.current) return;
    saving.current = true;
    await onCreate(next);
  }
  return (
    <input
      autoFocus
      value={name}
      placeholder="Kolomnaam"
      className="h-11 rounded-xl border border-ink/15 bg-white px-3 text-sm outline-none"
      onChange={(event) => setName(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
        if (event.key === "Enter") void save();
      }}
      onBlur={() => {
        if (!name.trim()) return onCancel();
        void save();
      }}
    />
  );
}

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-ink/40 p-4 md:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

function LabelsDialog({
  labels,
  onClose,
  onCreated,
  onDeleted,
  onError,
}: {
  labels: TodoLabelRow[];
  onClose: () => void;
  onCreated: (label: TodoLabelRow) => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<TodoLabelColor>(TODO_LABEL_COLORS[0].id);
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Labels</h2>
          <button type="button" onClick={onClose} className="text-ink/40" aria-label="Sluiten">
            ×
          </button>
        </div>
        <p className="mt-1 text-sm text-ink/45">Categorieën op de kaarten. Maak ze hier, koppel ze daarna in een taak.</p>
        <div className="mt-4 space-y-2">
          {labels.length ? (
            labels.map((label) => {
              const swatch = labelColor(label.color);
              return (
                <div key={label.id} className="flex items-center justify-between gap-3">
                  <span className="rounded px-2 py-0.5 text-xs font-semibold" style={{ background: swatch.bg, color: swatch.fg }}>
                    {label.name}
                  </span>
                  <button
                    type="button"
                    className="text-sm text-ink/45 hover:text-ink"
                    onClick={async () => {
                      const result = await deleteLabelAction(label.id);
                      if (!result.ok) return onError(result.message);
                      onDeleted(label.id);
                    }}
                  >
                    Verwijderen
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-ink/40">Nog geen labels.</p>
          )}
        </div>
        <form
          className="mt-5 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await createLabelAction(name, color);
            if (!result.ok) return onError(result.message);
            onCreated(result.label);
            setName("");
          }}
        >
          <label className="block text-sm">
            <span className="text-ink/55">Nieuw label</span>
            <input
              className="mt-1 h-10 w-full rounded-md border border-ink/10 px-3 text-sm outline-none focus-visible:border-copper"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Bijv. Website"
              required
            />
          </label>
          <div>
            <p className="text-sm text-ink/55">Kleur</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TODO_LABEL_COLORS.map((item) => (
                <label
                  key={item.id}
                  className={cn("grid size-8 cursor-pointer place-items-center rounded-lg border-2", color === item.id ? "border-ink" : "border-transparent")}
                  style={{ background: item.bg }}
                >
                  <input type="radio" name="color" value={item.id} checked={color === item.id} onChange={() => setColor(item.id)} className="sr-only" />
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-ivory hover:bg-ink/90">
            Toevoegen
          </button>
        </form>
      </div>
    </Overlay>
  );
}

function ColumnsDialog({
  buckets,
  todos,
  onClose,
  onBuckets,
  onTodos,
  onError,
}: {
  buckets: TodoBucketRow[];
  todos: BoardTodo[];
  onClose: () => void;
  onBuckets: (buckets: TodoBucketRow[]) => void;
  onTodos: (todos: BoardTodo[] | ((current: BoardTodo[]) => BoardTodo[])) => void;
  onError: (message: string) => void;
}) {
  const last = buckets.length - 1;
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-ink/10 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Kolommen</h2>
          <button type="button" onClick={onClose} className="text-ink/40" aria-label="Sluiten">
            ×
          </button>
        </div>
        <p className="mt-1 text-sm text-ink/45">Vaste indeling van het takenbord. Namen en volgorde kun je hier aanpassen.</p>
        <div className="mt-4 space-y-2">
          {buckets.map((bucket, index) => {
            const count = todos.filter((todo) => todo.bucket_id === bucket.id).length;
            return (
              <div key={bucket.id} className="flex flex-col gap-2 rounded-xl border border-ink/8 px-3 py-2 sm:flex-row sm:items-center">
                <input
                  className="h-9 flex-1 bg-transparent text-sm font-medium outline-none"
                  defaultValue={bucket.name}
                  onBlur={async (event) => {
                    const name = event.currentTarget.value.trim();
                    if (!name || name === bucket.name) {
                      event.currentTarget.value = bucket.name;
                      return;
                    }
                    const result = await renameBucketAction(bucket.id, name);
                    if (!result.ok) {
                      event.currentTarget.value = bucket.name;
                      return onError(result.message);
                    }
                    onBuckets(buckets.map((item) => (item.id === bucket.id ? result.bucket : item)));
                  }}
                />
                <span className="text-xs text-ink/40">{count === 1 ? "1 taak" : `${count} taken`}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    className="text-sm text-ink/45 hover:text-ink disabled:opacity-30"
                    onClick={async () => {
                      const result = await reorderBucketAction(bucket.id, -1);
                      if (!result.ok) return onError(result.message);
                      onBuckets(result.buckets);
                    }}
                  >
                    Omhoog
                  </button>
                  <button
                    type="button"
                    disabled={index === last}
                    className="text-sm text-ink/45 hover:text-ink disabled:opacity-30"
                    onClick={async () => {
                      const result = await reorderBucketAction(bucket.id, 1);
                      if (!result.ok) return onError(result.message);
                      onBuckets(result.buckets);
                    }}
                  >
                    Omlaag
                  </button>
                  <button
                    type="button"
                    className="text-sm text-ink/45 hover:text-ink"
                    onClick={async () => {
                      if (!confirm("Kolom verwijderen? Taken blijven bestaan, zonder kolom.")) return;
                      const result = await deleteBucketAction(bucket.id);
                      if (!result.ok) return onError(result.message);
                      onBuckets(buckets.filter((item) => item.id !== bucket.id));
                      onTodos((current) =>
                        current.map((todo) => (todo.bucket_id === bucket.id ? { ...todo, bucket_id: null } : todo))
                      );
                    }}
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Overlay>
  );
}

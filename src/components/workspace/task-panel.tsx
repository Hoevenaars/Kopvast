"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  addTodoCommentAction,
  deleteTodoAction,
  loadTodoCommentsAction,
  moveTodoAction,
  setTodoLabelsAction,
  toggleTodoDoneAction,
  updateTodoAction,
} from "@/app/(workspace)/admin/taken/actions";
import { workspaceRoutes } from "@/lib/product";
import {
  TODO_PRIORITIES,
  TODO_PROGRESS,
  checklistStats,
  labelColor,
  newChecklistItem,
  relativeTimeNl,
  type BoardTodo,
  type ChecklistItem,
  type TodoBucketRow,
  type TodoCommentRow,
  type TodoLabelRow,
} from "@/lib/todos";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-md border border-ink/10 bg-white px-3 text-sm text-ink outline-none focus-visible:border-copper focus-visible:ring-3 focus-visible:ring-copper/30";

type OrganizationOption = { id: string; name: string };

export function TaskPanel({
  todo,
  buckets,
  labels,
  organizations,
  onClose,
  onTodo,
  onDeleted,
  onError,
}: {
  todo: BoardTodo;
  buckets: TodoBucketRow[];
  labels: TodoLabelRow[];
  organizations: OrganizationOption[];
  onClose: () => void;
  onTodo: (todo: BoardTodo) => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
}) {
  const [comments, setComments] = useState<TodoCommentRow[]>([]);
  const [comment, setComment] = useState("");
  const [checkTitle, setCheckTitle] = useState("");
  const stats = checklistStats(todo.checklist);
  const done = todo.status === "done" || todo.progress === "voltooid";

  useEffect(() => {
    let active = true;
    loadTodoCommentsAction(todo.id).then((rows) => {
      if (active) setComments(rows);
    });
    return () => {
      active = false;
    };
  }, [todo.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function patch(next: Parameters<typeof updateTodoAction>[1]) {
    const result = await updateTodoAction(todo.id, next);
    if (!result.ok) return onError(result.message);
    onTodo(result.todo);
  }

  async function toggleLabel(labelId: string) {
    const next = new Set(todo.label_ids);
    if (next.has(labelId)) next.delete(labelId);
    else next.add(labelId);
    const result = await setTodoLabelsAction(todo.id, [...next]);
    if (!result.ok) return onError(result.message);
    onTodo(result.todo);
  }

  async function saveChecklist(checklist: ChecklistItem[]) {
    await patch({ checklist });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/40 p-0 md:items-center md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="grid h-full w-full max-w-[980px] overflow-hidden bg-white md:h-[min(90dvh,820px)] md:rounded-2xl md:border md:border-ink/10">
        <div className="grid min-h-0 md:grid-cols-[1.45fr_0.85fr]">
          <div className="min-w-0 overflow-y-auto p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-medium tracking-[0.14em] text-ink/40 uppercase">Takenbord</p>
              <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-lg text-ink/45 hover:bg-ivory" aria-label="Sluiten">
                ×
              </button>
            </div>
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={async () => {
                  const result = await toggleTodoDoneAction(todo.id);
                  if (!result.ok) return onError(result.message);
                  onTodo(result.todo);
                }}
                className={cn(
                  "mt-1 size-5 shrink-0 rounded-full border-2",
                  done ? "border-olive bg-olive" : "border-stone bg-transparent"
                )}
                aria-label={done ? "Heropenen" : "Afronden"}
              />
              <input
                className="w-full bg-transparent text-2xl font-semibold tracking-tight text-ink outline-none"
                defaultValue={todo.title}
                key={`${todo.id}-title`}
                placeholder="Taaknaam"
                onBlur={(event) => {
                  const title = event.currentTarget.value.trim();
                  if (title && title !== todo.title) void patch({ title });
                }}
              />
            </div>
            <p className="mt-2 text-xs text-ink/40">
              Gemaakt {relativeTimeNl(todo.created_at)}
              {todo.updated_at && todo.updated_at !== todo.created_at ? ` · gewijzigd ${relativeTimeNl(todo.updated_at)}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {labels.length ? (
                labels.map((label) => {
                  const color = labelColor(label.color);
                  const on = todo.label_ids.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => void toggleLabel(label.id)}
                      className={cn("rounded px-2 py-0.5 text-xs font-semibold", !on && "opacity-45")}
                      style={{ background: color.bg, color: color.fg }}
                    >
                      {label.name}
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-ink/40">Nog geen labels. Voeg ze toe via Labels op het bord.</p>
              )}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select className={fieldClass} value={todo.progress} onChange={(event) => void patch({ progress: event.target.value })}>
                  {TODO_PROGRESS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prioriteit">
                <select className={fieldClass} value={todo.priority} onChange={(event) => void patch({ priority: event.target.value })}>
                  {TODO_PRIORITIES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Begindatum">
                <input
                  type="date"
                  className={fieldClass}
                  value={todo.start_at ?? ""}
                  onChange={(event) => void patch({ start_at: event.target.value || null })}
                />
              </Field>
              <Field label="Einddatum">
                <input
                  type="date"
                  className={fieldClass}
                  value={todo.due_at ?? ""}
                  onChange={(event) => void patch({ due_at: event.target.value || null })}
                />
              </Field>
              <Field label="Kolom">
                <select
                  className={fieldClass}
                  value={todo.bucket_id ?? ""}
                  onChange={async (event) => {
                    const bucketId = event.target.value || null;
                    const result = await moveTodoAction(todo.id, bucketId);
                    if (!result.ok) return onError(result.message);
                    onTodo(result.todo);
                  }}
                >
                  <option value="">Niet ingedeeld</option>
                  {buckets.map((bucket) => (
                    <option key={bucket.id} value={bucket.id}>
                      {bucket.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Klant">
                <select
                  className={fieldClass}
                  value={todo.organization_id ?? ""}
                  onChange={(event) => void patch({ organization_id: event.target.value || null })}
                >
                  <option value="">Persoonlijk</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {todo.organization_id ? (
              <p className="mt-2 text-xs">
                <Link href={`${workspaceRoutes.adminCustomers}/${todo.organization_id}`} className="text-olive underline-offset-4 hover:underline">
                  Open klantdossier
                </Link>
              </p>
            ) : null}
            <div className="mt-6">
              <p className="text-sm font-medium text-ink">Controlelijst{stats.total ? ` · ${stats.done}/${stats.total}` : ""}</p>
              <div className="mt-3 space-y-2">
                {todo.checklist.map((item) => (
                  <label key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(event) =>
                        void saveChecklist(
                          todo.checklist.map((step) => (step.id === item.id ? { ...step, done: event.target.checked } : step))
                        )
                      }
                      className="size-4 rounded border-stone accent-olive"
                    />
                    <input
                      className="h-9 flex-1 border-b border-transparent bg-transparent text-sm outline-none focus:border-ink/20"
                      defaultValue={item.title}
                      onBlur={(event) => {
                        const title = event.currentTarget.value;
                        if (title !== item.title) {
                          void saveChecklist(todo.checklist.map((step) => (step.id === item.id ? { ...step, title } : step)));
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="px-1 text-ink/35 hover:text-ink"
                      aria-label="Stap verwijderen"
                      onClick={() => void saveChecklist(todo.checklist.filter((step) => step.id !== item.id))}
                    >
                      ×
                    </button>
                  </label>
                ))}
                <input
                  className="h-10 w-full border-b border-dashed border-ink/20 bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
                  placeholder="Voeg stappen toe om deze taak te voltooien…"
                  value={checkTitle}
                  onChange={(event) => setCheckTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const title = checkTitle.trim();
                    if (!title) return;
                    void saveChecklist([...todo.checklist, newChecklistItem(title)]);
                    setCheckTitle("");
                  }}
                />
              </div>
            </div>
            <div className="mt-6">
              <p className="text-sm font-medium text-ink">Notities</p>
              <textarea
                className="mt-2 min-h-28 w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus-visible:border-copper focus-visible:ring-3 focus-visible:ring-copper/30"
                defaultValue={todo.note ?? ""}
                key={`${todo.id}-note`}
                placeholder="Typ een beschrijving of voeg hier notities toe."
                onBlur={(event) => {
                  const note = event.currentTarget.value;
                  if (note !== (todo.note ?? "")) void patch({ note });
                }}
              />
            </div>
            <button
              type="button"
              className="mt-6 text-sm text-destructive underline-offset-4 hover:underline"
              onClick={async () => {
                if (!confirm("Deze taak verwijderen?")) return;
                const result = await deleteTodoAction(todo.id);
                if (!result.ok) return onError(result.message);
                onDeleted(todo.id);
              }}
            >
              Taak verwijderen
            </button>
          </div>
          <aside className="flex min-h-[240px] flex-col border-t border-ink/8 bg-[#F8F6F1] md:border-t-0 md:border-l">
            <h3 className="px-5 pt-5 text-sm font-semibold">Taakchat</h3>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {comments.length ? (
                comments.map((item) => (
                  <div key={item.id} className="ml-auto max-w-[95%] rounded-xl rounded-br-sm bg-[#5a604c] px-3 py-2 text-ivory">
                    <p className="text-sm">{item.body}</p>
                    <time className="mt-1 block text-[11px] text-ivory/70">{relativeTimeNl(item.created_at)}</time>
                  </div>
                ))
              ) : (
                <p className="text-xs text-ink/40">Nog geen berichten. Handig voor een korte aantekening bij de taak.</p>
              )}
            </div>
            <form
              className="flex gap-2 border-t border-ink/8 p-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const body = comment.trim();
                if (!body) return;
                const result = await addTodoCommentAction(todo.id, body);
                if (!result.ok) return onError(result.message);
                setComments(result.comments);
                setComment("");
              }}
            >
              <input
                className={fieldClass}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Typ een bericht"
                autoComplete="off"
              />
              <button type="submit" className="rounded-md bg-ink px-3 text-sm font-semibold text-ivory hover:bg-ink/90">
                Stuur
              </button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="block text-ink/55">{label}</span>
      {children}
    </label>
  );
}

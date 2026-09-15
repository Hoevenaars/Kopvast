"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { workspaceRoutes } from "@/lib/product";
import {
  addTodoComment,
  createBucket,
  createLabel,
  createTodo,
  deleteBucket,
  deleteLabel,
  deleteTodo,
  loadTodoComments,
  moveTodo,
  renameBucket,
  reorderBucket,
  setTodoLabels,
  toggleTodoDone,
  updateTodo,
  type TodoPatch,
} from "@/lib/todo-board";

async function requireAdmin() {
  const session = await requireSession("admin");
  if (!session) redirect(`${workspaceRoutes.login}?next=${workspaceRoutes.adminTaken}`);
  return session;
}

export async function createTodoAction(input: { title: string; bucketId?: string | null; organizationId?: string | null }) {
  await requireAdmin();
  return createTodo({
    title: input.title,
    bucket_id: input.bucketId,
    organization_id: input.organizationId,
  });
}

export async function updateTodoAction(id: string, patch: TodoPatch) {
  await requireAdmin();
  return updateTodo(id, patch);
}

export async function toggleTodoDoneAction(id: string) {
  await requireAdmin();
  return toggleTodoDone(id);
}

export async function moveTodoAction(id: string, bucketId: string | null) {
  await requireAdmin();
  return moveTodo(id, bucketId);
}

export async function deleteTodoAction(id: string) {
  await requireAdmin();
  return deleteTodo(id);
}

export async function createBucketAction(name: string) {
  await requireAdmin();
  return createBucket(name);
}

export async function renameBucketAction(id: string, name: string) {
  await requireAdmin();
  return renameBucket(id, name);
}

export async function reorderBucketAction(id: string, dir: number) {
  await requireAdmin();
  return reorderBucket(id, dir);
}

export async function deleteBucketAction(id: string) {
  await requireAdmin();
  return deleteBucket(id);
}

export async function createLabelAction(name: string, color: string) {
  await requireAdmin();
  return createLabel(name, color);
}

export async function deleteLabelAction(id: string) {
  await requireAdmin();
  return deleteLabel(id);
}

export async function setTodoLabelsAction(todoId: string, labelIds: string[]) {
  await requireAdmin();
  return setTodoLabels(todoId, labelIds);
}

export async function loadTodoCommentsAction(todoId: string) {
  await requireAdmin();
  return loadTodoComments(todoId);
}

export async function addTodoCommentAction(todoId: string, body: string) {
  await requireAdmin();
  return addTodoComment(todoId, body);
}

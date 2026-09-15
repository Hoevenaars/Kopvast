import type { Metadata } from "next";
import { PageIntro } from "@/components/workspace/page-frame";
import { TaskBoard } from "@/components/workspace/task-board";
import { loadTodoBoard } from "@/lib/todo-board";

export const metadata: Metadata = {
  title: "Taken",
  robots: { index: false, follow: false },
};

export default async function AdminTasksPage() {
  const board = await loadTodoBoard();

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6">
      <PageIntro
        eyebrow="Taken"
        title="Takenbord"
        text="Sleep kaarten tussen kolommen, net als in Planner. Kolommen en labels beheer je hier."
      />
      <TaskBoard
        initialBuckets={board.buckets}
        initialLabels={board.labels}
        initialTodos={board.todos}
        organizations={board.organizations}
      />
    </div>
  );
}

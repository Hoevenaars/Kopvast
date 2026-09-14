import type { ReactNode } from "react";

export default function WorkspaceGroupLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col bg-ivory">{children}</div>;
}

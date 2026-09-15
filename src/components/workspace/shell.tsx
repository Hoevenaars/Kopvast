import Link from "next/link";

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone/70 p-8">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-olive">{text}</p>
    </div>
  );
}

export function DataList({
  items,
}: {
  items: Array<{ href?: string; title: string; meta: string; extra?: string }>;
}) {
  return (
    <ul className="divide-y divide-stone/40 rounded-2xl border border-stone/50">
      {items.map((item) => (
        <li key={`${item.title}-${item.meta}`}>
          {item.href ? (
            <Link href={item.href} className="block px-5 py-4 hover:bg-muted/40">
              <Row {...item} />
            </Link>
          ) : (
            <div className="px-5 py-4">
              <Row {...item} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Row({ title, meta, extra }: { title: string; meta: string; extra?: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-sm text-olive">{meta}</p>
      </div>
      {extra ? <p className="text-xs text-olive">{extra}</p> : null}
    </div>
  );
}

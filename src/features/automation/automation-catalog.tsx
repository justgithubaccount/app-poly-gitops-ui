"use client";

import { EmptyState, ErrorState, ListSkeleton, ReadNotice } from "@/components/layout/data-state";
import { resolveAsyncView } from "@/lib/async/view";

type CatalogListProps = {
  title: string;
  id: string;
  items: string[] | undefined;
  error: unknown;
  refreshing: boolean;
  onRetry: () => void;
  emptyTitle: string;
};

export function AutomationCatalog({
  title,
  id,
  items,
  error,
  refreshing,
  onRetry,
  emptyTitle,
}: CatalogListProps) {
  const view = resolveAsyncView(items, error, refreshing, (value) => value.length === 0);
  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-section-head rounded-lg border p-panel-comfortable"
    >
      <h2 id={id} className="text-section">
        {title}
      </h2>
      <ReadNotice stale={view.stale} refreshing={view.refreshing} />
      {view.phase === "loading" && <ListSkeleton />}
      {view.phase === "error" && <ErrorState error={error} onRetry={onRetry} />}
      {view.phase === "empty" && (
        <EmptyState title={emptyTitle} description="Сервис вернул пустой список." />
      )}
      {view.phase === "ready" && (
        <ul aria-label={title} className="flex min-w-0 flex-col gap-inline">
          {items?.map((item) => (
            <li key={item} className="wrap-anywhere font-mono text-data">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

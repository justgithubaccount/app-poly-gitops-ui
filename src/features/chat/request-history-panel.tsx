"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton, ReadNotice } from "@/components/layout/data-state";
import { apiRequest } from "@/lib/api/client";
import { historySchema } from "@/lib/api/schemas";
import { resolveAsyncView } from "@/lib/async/view";

export function RequestHistoryPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const path = `projects/${encodeURIComponent(projectId)}/history`;
  const { data, error, isValidating, mutate } = useSWR(open ? path : null, () =>
    apiRequest(path, historySchema),
  );
  const view = resolveAsyncView(data, error, isValidating, (rows) => rows.length === 0);
  return (
    <details
      className="border-t pt-panel-comfortable"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-module">История запросов проекта</summary>
      <div className="mt-section-head flex flex-col gap-section-head">
        <p className="text-caption text-muted-foreground">
          Бэк сохраняет входные сообщения перед вызовом модели. Это снимки запросов, а не полная
          история ответов.
        </p>
        <Button
          variant="outline"
          className="self-start"
          onClick={() => void mutate()}
          disabled={isValidating}
        >
          Обновить историю
        </Button>
        <ReadNotice stale={view.stale} refreshing={view.refreshing} />
        {view.phase === "loading" && <ListSkeleton />}
        {view.phase === "error" && <ErrorState error={error} onRetry={() => void mutate()} />}
        {view.phase === "empty" && (
          <EmptyState
            title="Запросов пока нет"
            description="После отправки сообщения в проекте появится снимок запроса."
          />
        )}
        {view.phase === "ready" && (
          <ol className="flex flex-col gap-panel-comfortable">
            {data?.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-inline border-t pt-panel-compact">
                <time dateTime={entry.timestamp} className="text-data text-muted-foreground">
                  {entry.timestamp}
                </time>
                <span className="break-all font-mono text-caption">Запрос: {entry.id}</span>
                {entry.messages.map((message, index) => (
                  <p key={index} className="whitespace-pre-wrap break-words">
                    <span className="font-medium">{message.role}: </span>
                    {message.content}
                  </p>
                ))}
                {entry.trace_id && (
                  <p className="break-all font-mono text-caption">trace_id: {entry.trace_id}</p>
                )}
                {entry.span_id && (
                  <p className="break-all font-mono text-caption">span_id: {entry.span_id}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}

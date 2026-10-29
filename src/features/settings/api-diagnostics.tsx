"use client";

import useSWR from "swr";
import { ApiError, apiRequest } from "@/lib/api/client";
import { behaviorSchema, healthSchema } from "@/lib/api/schemas";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/layout/data-state";

export function ApiDiagnostics() {
  const health = useSWR("health", () => apiRequest("health", healthSchema));
  const behavior = useSWR("behavior/schema", () => apiRequest("behavior/schema", behaviorSchema));
  const missingBehavior = behavior.error instanceof ApiError && behavior.error.status === 404;
  return (
    <section aria-labelledby="api-heading" className="flex flex-col gap-panel-comfortable">
      <div className="flex flex-wrap items-center justify-between gap-section-head">
        <h2 id="api-heading" className="text-section">
          Подключение к API
        </h2>
        <Button
          variant="outline"
          disabled={health.isValidating || behavior.isValidating}
          onClick={() => {
            void health.mutate();
            void behavior.mutate();
          }}
        >
          Проверить подключение
        </Button>
      </div>
      <p className="max-w-reading text-body-supporting text-muted-foreground">
        Адрес задаётся переменной CHAT_API_URL на сервере UI. Проверка доступности не вызывает
        модель.
      </p>
      {health.isLoading && <ListSkeleton />}
      {health.error && <ErrorState error={health.error} onRetry={() => void health.mutate()} />}
      {health.data && !health.error && (
        <p role="status" className="text-body-supporting text-success">
          API отвечает: {health.data.status}. Доступность LLM этим не проверена.
        </p>
      )}
      <div className="flex flex-col gap-section-head">
        <h3 className="text-module">Схема поведения</h3>
        {behavior.isLoading && <ListSkeleton />}
        {missingBehavior && (
          <EmptyState
            title="Схема поведения не загружена"
            description="Сервис вернул 404 для behavior/schema. Чат и проекты проверяются отдельно."
          />
        )}
        {behavior.error && !missingBehavior && (
          <ErrorState error={behavior.error} onRetry={() => void behavior.mutate()} />
        )}
        {behavior.data && !behavior.error && (
          <pre className="max-w-full overflow-x-auto rounded-md border bg-muted/20 p-panel-comfortable text-data">
            {JSON.stringify(behavior.data, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
}

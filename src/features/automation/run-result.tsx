import type { RunResponse } from "@/lib/api/automation-schemas";

export type RunSubmission = { flow: string; namespace: string; appName?: string | null };

export function RunResult({
  response,
  submission,
}: {
  response: RunResponse;
  submission: RunSubmission;
}) {
  return (
    <section
      aria-labelledby="run-result-heading"
      className="flex min-w-0 flex-col gap-panel-comfortable border-t pt-panel-comfortable"
    >
      <div className="flex min-w-0 flex-col gap-inline">
        <h2 id="run-result-heading" className="text-section">
          Результат запуска
        </h2>
        <p className="wrap-anywhere text-caption text-muted-foreground">
          Flow: {submission.flow || "По умолчанию на сервере"} · namespace: {submission.namespace}
          {submission.appName ? ` · приложение: ${submission.appName}` : ""}
        </p>
        {response.metadata.total_duration_ms !== undefined && (
          <p className="text-caption text-muted-foreground">
            Общая длительность: {response.metadata.total_duration_ms} мс
          </p>
        )}
        {response.metadata.trace_id && (
          <p className="wrap-anywhere font-mono text-caption">
            trace_id: {response.metadata.trace_id}
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-section-head">
        <h3 className="text-module">Итоговый ответ</h3>
        {response.final_answer ? (
          <p className="whitespace-pre-wrap wrap-anywhere text-body">{response.final_answer}</p>
        ) : (
          <p className="text-body-supporting text-muted-foreground">
            Сервис вернул пустой итоговый ответ.
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-section-head">
        <h3 className="text-module">Выполненные шаги</h3>
        {response.steps.length === 0 ? (
          <p className="text-body-supporting text-muted-foreground">Сервис не вернул шагов.</p>
        ) : (
          <ol aria-label="Шаги выполнения" className="flex min-w-0 flex-col gap-section-head">
            {response.steps.map((step, index) => (
              <li key={index} className="min-w-0 rounded-lg border p-panel-compact">
                <details className="min-w-0">
                  <summary className="cursor-pointer wrap-anywhere text-module">
                    {index + 1}. {step.task}
                    <span className="mt-inline block wrap-anywhere text-caption font-normal text-muted-foreground">
                      Агент: {step.agent} · {step.duration_ms} мс
                    </span>
                  </summary>
                  <p className="mt-section-head whitespace-pre-wrap wrap-anywhere text-body-supporting">
                    {step.output || "Сервис вернул пустой вывод шага."}
                  </p>
                </details>
              </li>
            ))}
          </ol>
        )}
      </div>
      <details className="min-w-0">
        <summary className="cursor-pointer text-module">Метаданные</summary>
        <pre className="mt-section-head max-w-full overflow-x-auto rounded-md border bg-muted/20 p-panel-compact text-data">
          {JSON.stringify(response.metadata, null, 2)}
        </pre>
      </details>
    </section>
  );
}

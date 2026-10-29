"use client";

import { useRef, useState, type FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { automationRequest } from "@/lib/api/client";
import {
  flowNameSchema,
  parseRunContext,
  runRequestSchema,
  runResponseSchema,
  type RunResponse,
} from "@/lib/api/automation-schemas";
import { RunResult, type RunSubmission } from "./run-result";

export function RunForm({ flows, available }: { flows: string[]; available: boolean }) {
  const [flow, setFlow] = useState("");
  const [namespace, setNamespace] = useState("default");
  const [appName, setAppName] = useState("");
  const [context, setContext] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ response: RunResponse; submission: RunSubmission } | null>(
    null,
  );
  const inFlight = useRef(false);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !available || !confirmed) return;
    setError(null);
    let body;
    try {
      body = runRequestSchema.parse({
        namespace,
        app_name: appName.trim() || undefined,
        context: parseRunContext(context),
      });
      if (flow && (!flows.includes(flow) || !flowNameSchema.safeParse(flow).success)) {
        throw new Error("Выберите flow из доступного списка или серверный вариант по умолчанию");
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Проверьте поля запуска");
      setConfirmed(false);
      return;
    }
    inFlight.current = true;
    setPending(true);
    setConfirmed(false);
    setResult(null);
    try {
      const response = await automationRequest(
        flow ? `run/${encodeURIComponent(flow)}` : "run",
        runResponseSchema,
        { method: "POST", body: JSON.stringify(body) },
      );
      setResult({
        response,
        submission: { flow, namespace: body.namespace, appName: body.app_name },
      });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Не удалось получить результат запуска",
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <section aria-labelledby="run-heading" className="flex min-w-0 flex-col gap-section-head">
        <h2 id="run-heading" className="text-section">
          Запуск flow
        </h2>
        <p className="max-w-reading text-body-supporting text-muted-foreground">
          Запуск может вызвать платную модель, изменить инфраструктуру или создать issue.
          Доступность API не подтверждает готовность кластера, инструментов или LLM.
        </p>
        {!available && (
          <p role="status" className="text-body-supporting text-warning">
            Запуск недоступен, пока сервис CrewAI не ответит на проверку подключения.
          </p>
        )}
        <form onSubmit={run} className="flex min-w-0 max-w-reading flex-col gap-field">
          <fieldset disabled={pending} className="flex min-w-0 flex-col gap-field">
            <legend className="sr-only">Параметры запуска</legend>
            <Field>
              <FieldLabel htmlFor="run-flow">Flow</FieldLabel>
              <select
                id="run-flow"
                value={flow}
                onChange={(event) => {
                  setFlow(event.target.value);
                  setConfirmed(false);
                }}
                className="h-control-h w-full min-w-0 rounded-md border border-input bg-background px-panel-compact text-body-supporting outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">По умолчанию на сервере</option>
                {flows.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid min-w-0 gap-field sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="run-namespace">Namespace</FieldLabel>
                <Input
                  id="run-namespace"
                  value={namespace}
                  onChange={(event) => {
                    setNamespace(event.target.value);
                    setConfirmed(false);
                  }}
                  required
                  maxLength={253}
                  autoComplete="off"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="run-app">Имя приложения</FieldLabel>
                <Input
                  id="run-app"
                  value={appName}
                  onChange={(event) => {
                    setAppName(event.target.value);
                    setConfirmed(false);
                  }}
                  maxLength={253}
                  placeholder="По умолчанию на сервере"
                  autoComplete="off"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="run-context">Контекст (JSON)</FieldLabel>
              <Textarea
                id="run-context"
                value={context}
                onChange={(event) => {
                  setContext(event.target.value);
                  setConfirmed(false);
                }}
                placeholder='{"question": "Что проверить?"}'
                spellCheck={false}
                maxLength={900000}
                aria-describedby="run-context-help"
                className="font-mono"
              />
              <p id="run-context-help" className="text-caption text-muted-foreground">
                Необязательный JSON-объект. Namespace и имя приложения задаются выше; ключи
                namespace и app_name здесь запрещены. Не вводите секреты.
              </p>
            </Field>
            <label className="flex items-start gap-inline text-body-supporting">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="size-4 shrink-0 accent-primary"
              />
              <span>
                Понимаю, что flow может менять инфраструктуру, создавать issues и использовать
                платную модель. Подтверждаю запуск с указанными параметрами.
              </span>
            </label>
            <Button
              type="submit"
              className="self-start"
              disabled={!available || !confirmed || pending}
            >
              {pending ? "Выполняется…" : "Запустить flow"}
            </Button>
          </fieldset>
        </form>
        {pending && (
          <p role="status" className="text-body-supporting text-muted-foreground">
            Ожидаем завершения flow. API вернёт все шаги одним ответом, без живого прогресса.
          </p>
        )}
        {error && (
          <Alert role="alert" aria-label="Ошибка запуска">
            <AlertTitle>Результат запуска не получен</AlertTitle>
            <AlertDescription className="flex flex-col gap-inline">
              <p className="whitespace-pre-wrap wrap-anywhere">{error}</p>
              <p>
                Если запрос дошёл до CrewAI, выполнение могло продолжиться. Проверьте состояние
                сервиса перед повторным запуском. Автоматической повторной отправки нет.
              </p>
            </AlertDescription>
          </Alert>
        )}
        <p className="max-w-reading text-caption text-muted-foreground">
          Этот экран не сохраняет историю запусков: результат доступен до ухода со страницы или
          перезагрузки. Закрытие страницы и таймаут не отменяют выполнение на сервере.
        </p>
      </section>
      {result && <RunResult response={result.response} submission={result.submission} />}
    </div>
  );
}

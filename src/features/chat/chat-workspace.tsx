"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/icons";
import { EmptyState } from "@/components/layout/data-state";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api/client";
import { chatResponseSchema, type Message } from "@/lib/api/schemas";
import { RequestHistoryPanel } from "./request-history-panel";

export function ChatWorkspace({ projectId }: { projectId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || controller.current) return;
    const requestController = new AbortController();
    controller.current = requestController;
    const nextMessages: Message[] = [...messages, { role: "user", content: draft.trim() }];
    setPendingMessage(draft.trim());
    setError(null);
    try {
      const response = await apiRequest(
        projectId ? `projects/${encodeURIComponent(projectId)}/chat` : "chat",
        chatResponseSchema,
        {
          method: "POST",
          body: JSON.stringify({ messages: nextMessages }),
          signal: requestController.signal,
        },
      );
      setMessages([...nextMessages, { role: "assistant", content: response.reply }]);
      setDraft("");
    } catch (failure) {
      if (!requestController.signal.aborted)
        setError(failure instanceof Error ? failure.message : "Не удалось отправить запрос");
    } finally {
      if (!requestController.signal.aborted) {
        setPendingMessage(null);
        controller.current = null;
        requestAnimationFrame(() => input.current?.focus());
      }
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-section-gap px-page-x-mobile pt-page-top pb-panel-comfortable md:px-page-x">
      <PageHeader
        title={projectId ? "Чат проекта" : "Быстрый чат"}
        description={
          projectId
            ? "Контекст этого сеанса передаётся модели с каждым сообщением."
            : "Отдельный сеанс без сохранения в проекте."
        }
        actions={
          projectId && (
            <Button variant="outline" asChild>
              <Link href="/">
                <AppIcon name="back" data-icon="inline-start" />
                Проекты
              </Link>
            </Button>
          )
        }
      />
      {projectId && (
        <p className="break-all font-mono text-caption text-muted-foreground">
          Проект: {projectId}
        </p>
      )}
      <section
        aria-label="Сообщения"
        aria-live="polite"
        aria-relevant="additions text"
        className="mx-auto flex w-full max-w-reading flex-1 flex-col gap-panel-comfortable"
      >
        {messages.length === 0 && pendingMessage === null && (
          <EmptyState
            title="С чего начнём?"
            description="Напишите сообщение. Ответ модели появится здесь после завершения запроса."
          />
        )}
        {messages.map((message, index) => (
          <article key={index} className="flex flex-col gap-inline">
            <h2 className="text-module">{message.role === "user" ? "Вы" : "Модель"}</h2>
            <p className="whitespace-pre-wrap break-words text-body">{message.content}</p>
          </article>
        ))}
        {pendingMessage !== null && (
          <>
            <article>
              <h2 className="text-module">Вы</h2>
              <p className="mt-inline whitespace-pre-wrap break-words">{pendingMessage}</p>
            </article>
            <p role="status" className="text-body-supporting text-muted-foreground">
              Модель готовит ответ…
            </p>
          </>
        )}
        {error && (
          <Alert role="alert" aria-label="Ошибка отправки">
            <AlertTitle>Запрос не завершён</AlertTitle>
            <AlertDescription>
              <p>{error}</p>
              <p>Черновик сохранён. Повторная отправка создаст ещё один запрос.</p>
            </AlertDescription>
          </Alert>
        )}
      </section>
      <div className="mx-auto flex w-full max-w-reading flex-col gap-section-head">
        <form onSubmit={send} className="flex flex-col gap-section-head">
          <Field>
            <FieldLabel htmlFor="chat-message">Сообщение</FieldLabel>
            <Textarea
              ref={input}
              id="chat-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              disabled={pendingMessage !== null}
              required
              placeholder="Напишите модели…"
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-section-head">
            <p className="max-w-reading text-caption text-muted-foreground">
              Ответы этого сеанса хранятся в памяти вкладки.
            </p>
            <Button type="submit" disabled={!draft.trim() || pendingMessage !== null}>
              <AppIcon name="send" data-icon="inline-start" />
              {pendingMessage !== null ? "Ожидание ответа…" : "Отправить"}
            </Button>
          </div>
        </form>
        {projectId && <RequestHistoryPanel projectId={projectId} />}
      </div>
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AppIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, ListSkeleton, ReadNotice } from "@/components/layout/data-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { apiRequest } from "@/lib/api/client";
import { createProjectSchema, projectSchema, projectsSchema } from "@/lib/api/schemas";
import { resolveAsyncView } from "@/lib/async/view";

const loadProjects = () => apiRequest("projects", projectsSchema);

export function ProjectsWorkspace() {
  const { data, error, isValidating, mutate } = useSWR("projects", loadProjects);
  const view = resolveAsyncView(data, error, isValidating, (items) => items.length === 0);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = createProjectSchema.safeParse({ name });
    if (!input.success) {
      setCreateError("Введите название проекта: от 1 до 200 символов");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await apiRequest("projects", projectSchema, {
        method: "POST",
        body: JSON.stringify(input.data),
      });
      setName("");
      await mutate((items) => (items ? [...items, created] : [created]), { revalidate: true });
    } catch (failure) {
      setCreateError(failure instanceof Error ? failure.message : "Не удалось создать проект");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-section-gap px-page-x-mobile pt-page-top pb-section-gap md:px-page-x">
      <PageHeader
        title="Проекты"
        description="Объединяйте запросы к модели по проектам и проверяйте их историю."
        actions={
          <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
            <AppIcon name="refresh" data-icon="inline-start" /> Обновить
          </Button>
        }
      />
      <section
        aria-labelledby="create-project-heading"
        className="flex max-w-reading flex-col gap-section-head"
      >
        <h2 id="create-project-heading" className="text-section">
          Новый проект
        </h2>
        <form onSubmit={create} className="flex flex-wrap items-end gap-section-head">
          <Field className="min-w-0 flex-1 basis-60" data-invalid={Boolean(createError)}>
            <FieldLabel htmlFor="project-name">Название проекта</FieldLabel>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={200}
              required
              disabled={creating}
              aria-invalid={Boolean(createError)}
              aria-describedby={createError ? "create-project-error" : undefined}
              autoComplete="off"
              placeholder="Например, исследование API"
            />
          </Field>
          <Button type="submit" disabled={creating}>
            <AppIcon name="add" data-icon="inline-start" />
            {creating ? "Создание…" : "Создать проект"}
          </Button>
        </form>
        {createError && (
          <p
            id="create-project-error"
            role="alert"
            className="text-body-supporting text-destructive"
          >
            {createError}
          </p>
        )}
      </section>
      <section aria-labelledby="project-list-heading" className="flex flex-col gap-section-head">
        <h2 id="project-list-heading" className="text-section">
          Ваши проекты
        </h2>
        <ReadNotice stale={view.stale} refreshing={view.refreshing} />
        {view.phase === "loading" && <ListSkeleton />}
        {view.phase === "error" && <ErrorState error={error} onRetry={() => void mutate()} />}
        {view.phase === "empty" && (
          <EmptyState
            title="Пока нет проектов"
            description="Создайте первый проект с помощью формы выше. Его запросы появятся здесь."
          />
        )}
        {view.phase === "ready" && (
          <ul className="divide-y rounded-lg border" aria-label="Список проектов">
            {data?.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${encodeURIComponent(project.id)}`}
                  className="flex min-h-queue-row-min items-center gap-section-head p-panel-comfortable transition-colors hover:bg-accent"
                >
                  <AppIcon name="project" className="size-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-module">{project.name}</span>
                    <span className="mt-inline block break-all font-mono text-caption text-muted-foreground">
                      {project.id}
                    </span>
                  </span>
                  <AppIcon name="open" className="size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

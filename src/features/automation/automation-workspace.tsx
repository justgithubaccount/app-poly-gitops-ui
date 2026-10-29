"use client";

import useSWR from "swr";
import { AppIcon } from "@/components/icons";
import { ErrorState, ListSkeleton, ReadNotice } from "@/components/layout/data-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { automationRequest } from "@/lib/api/client";
import { agentsSchema, flowsSchema } from "@/lib/api/automation-schemas";
import { healthSchema } from "@/lib/api/schemas";
import { resolveAsyncView } from "@/lib/async/view";
import { AutomationCatalog } from "./automation-catalog";
import { RunForm } from "./run-form";

const loadHealth = () => automationRequest("health", healthSchema);
const loadFlows = () => automationRequest("flows", flowsSchema);
const loadAgents = () => automationRequest("agents", agentsSchema);

export function AutomationWorkspace() {
  // Namespaced SWR keys prevent collisions with the Chat API catalog/health.
  const health = useSWR("automation/health", loadHealth);
  const flows = useSWR("automation/flows", loadFlows);
  const agents = useSWR("automation/agents", loadAgents);
  const healthView = resolveAsyncView(health.data, health.error, health.isValidating);
  const busy = health.isValidating || flows.isValidating || agents.isValidating;
  const flowNames = [...new Set(flows.data?.flows ?? [])];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-section-gap px-page-x-mobile pt-page-top pb-section-gap md:px-page-x">
      <PageHeader
        title="Автоматизация"
        description="Агенты и flows CrewAI: ручной запуск и проверка результата."
        actions={
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              void health.mutate();
              void flows.mutate();
              void agents.mutate();
            }}
          >
            <AppIcon name="refresh" data-icon="inline-start" /> Обновить
          </Button>
        }
      />
      <section
        aria-labelledby="automation-connection-heading"
        className="flex flex-col gap-section-head"
      >
        <h2 id="automation-connection-heading" className="text-section">
          Сервис CrewAI
        </h2>
        <p className="max-w-reading text-body-supporting text-muted-foreground">
          Отдельный backend. Подключение задаётся переменной CREWAI_API_URL на сервере UI; ключи и
          доступ к кластеру настраиваются в CrewAI.
        </p>
        <ReadNotice stale={healthView.stale} refreshing={healthView.refreshing} />
        {healthView.phase === "loading" && <ListSkeleton />}
        {healthView.phase === "error" && (
          <ErrorState error={health.error} onRetry={() => void health.mutate()} />
        )}
        {health.data && (
          <p role="status" className="text-body-supporting">
            CrewAI отвечает: {health.data.status}
          </p>
        )}
      </section>
      <div className="grid min-w-0 gap-panel-comfortable lg:grid-cols-2">
        <AutomationCatalog
          id="automation-flows-heading"
          title="Доступные flows"
          items={flows.data?.flows}
          error={flows.error}
          refreshing={flows.isValidating}
          onRetry={() => void flows.mutate()}
          emptyTitle="Flows не найдены"
        />
        <AutomationCatalog
          id="automation-agents-heading"
          title="Агенты"
          items={agents.data?.agents}
          error={agents.error}
          refreshing={agents.isValidating}
          onRetry={() => void agents.mutate()}
          emptyTitle="Агенты не найдены"
        />
      </div>
      <RunForm flows={flowNames} available={health.data?.status === "ok" && !health.error} />
    </div>
  );
}

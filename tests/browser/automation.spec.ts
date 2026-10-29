import { expect, test, type Page } from "@playwright/test";

const traceId = "0123456789abcdef0123456789abcdef";
const result = {
  final_answer: "Проверка кластера завершена",
  steps: [
    {
      agent: "k8s_operator",
      task: "k8s_pods_overview",
      output: "Все поды готовы",
      duration_ms: 125,
    },
  ],
  metadata: { total_duration_ms: 200, trace_id: traceId, incident_created: false },
};

async function fixture(page: Page, options: { flows?: string[]; agents?: string[] } = {}) {
  await page.route("**/api/automation/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/automation/", "");
    if (path === "health") return route.fulfill({ json: { status: "ok" } });
    if (path === "flows")
      return route.fulfill({
        json: { flows: options.flows ?? ["k8s-healthcheck", "infra-health"] },
      });
    if (path === "agents")
      return route.fulfill({
        json: { agents: options.agents ?? ["k8s_operator", "incident_triager"] },
      });
    if (path === "run" || path.startsWith("run/")) return route.fulfill({ json: result });
    return route.fulfill({ status: 404, json: { detail: "Missing explicit fixture" } });
  });
}

const runButton = (page: Page) => page.getByRole("button", { name: "Запустить flow", exact: true });
const acknowledgement = (page: Page) => page.getByRole("checkbox", { name: /Понимаю, что flow/ });

test("discovers agents/flows and runs a selected flow only after acknowledgement", async ({
  page,
}) => {
  await fixture(page);
  const writes: { path: string; body: unknown }[] = [];
  await page.route("**/api/automation/run/**", async (route) => {
    writes.push({
      path: new URL(route.request().url()).pathname,
      body: route.request().postDataJSON(),
    });
    return route.fulfill({ json: result });
  });
  await page.goto("/automation");
  await expect(page.getByRole("link", { name: "Автоматизация", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("list", { name: "Агенты" })).toContainText("k8s_operator");
  await expect(runButton(page)).toBeDisabled();
  expect(writes).toHaveLength(0);
  await page.getByLabel("Flow", { exact: true }).selectOption("infra-health");
  await page.getByLabel("Namespace", { exact: true }).fill("production");
  await page.getByLabel("Имя приложения", { exact: true }).fill("chat-api");
  await page
    .getByLabel("Контекст (JSON)", { exact: true })
    .fill('{"question":"Что с приложением?"}');
  await acknowledgement(page).check();
  await runButton(page).click();
  await expect(page.getByRole("heading", { name: "Результат запуска", exact: true })).toBeVisible();
  await expect(page.getByText("Проверка кластера завершена", { exact: true })).toBeVisible();
  await page.getByText("k8s_pods_overview", { exact: false }).click();
  await expect(page.getByText("Все поды готовы", { exact: true })).toBeVisible();
  await expect(page.getByText(`trace_id: ${traceId}`, { exact: true })).toBeVisible();
  expect(writes).toEqual([
    {
      path: "/api/automation/run/infra-health",
      body: {
        namespace: "production",
        app_name: "chat-api",
        context: { question: "Что с приложением?" },
      },
    },
  ]);
  await expect(acknowledgement(page)).not.toBeChecked();
  await expect(runButton(page)).toBeDisabled();
  await expect(page.getByText(/не сохраняет историю запусков/)).toBeVisible();
});

test("server-default run uses /run and acknowledgement resets after target edits", async ({
  page,
}) => {
  await fixture(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") requests.push(new URL(request.url()).pathname);
  });
  await page.goto("/automation");
  await expect(page.getByText("CrewAI отвечает: ok", { exact: true })).toBeVisible();
  await acknowledgement(page).check();
  await page.getByLabel("Namespace", { exact: true }).fill("staging");
  await expect(acknowledgement(page)).not.toBeChecked();
  await expect(runButton(page)).toBeDisabled();
  await acknowledgement(page).check();
  await runButton(page).click();
  await expect(page.getByRole("heading", { name: "Результат запуска", exact: true })).toBeVisible();
  expect(requests).toEqual(["/api/automation/run"]);
});

test("invalid JSON and hidden target overrides never start a flow", async ({ page }) => {
  await fixture(page);
  let writes = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") writes += 1;
  });
  await page.goto("/automation");
  await expect(page.getByText("CrewAI отвечает: ok", { exact: true })).toBeVisible();
  for (const context of ["{", "[]", '{"namespace":"other"}', '{"app_name":"other"}']) {
    await page.getByLabel("Контекст (JSON)", { exact: true }).fill(context);
    await acknowledgement(page).check();
    await runButton(page).click();
    await expect(page.getByRole("alert", { name: "Ошибка запуска" })).toContainText(
      "Контекст должен быть",
    );
    await expect(page.getByLabel("Контекст (JSON)", { exact: true })).toHaveValue(context);
  }
  expect(writes).toBe(0);
});

test("pending execution blocks duplicate submissions and has no fake live steps", async ({
  page,
}) => {
  await fixture(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route("**/api/automation/run", async (route) => {
    writes += 1;
    await gate;
    await route.fulfill({ json: result });
  });
  await page.goto("/automation");
  await expect(page.getByText("CrewAI отвечает: ok", { exact: true })).toBeVisible();
  await acknowledgement(page).check();
  await runButton(page).click();
  await expect(page.getByText(/Ожидаем завершения flow/)).toBeVisible();
  await expect(page.getByLabel("Namespace", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Выполняется…", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Результат запуска", exact: true })).toHaveCount(
    0,
  );
  expect(writes).toBe(1);
  release();
  await expect(page.getByRole("heading", { name: "Результат запуска", exact: true })).toBeVisible();
});

test("timeout preserves form, warns about continuing work and never retries POST", async ({
  page,
}) => {
  await fixture(page);
  let writes = 0;
  await page.route("**/api/automation/run", (route) => {
    writes += 1;
    return route.fulfill({
      status: 504,
      json: { detail: "API не ответил вовремя. Запрос мог продолжить выполнение." },
    });
  });
  await page.goto("/automation");
  await page.getByLabel("Namespace", { exact: true }).fill("production");
  await acknowledgement(page).check();
  await runButton(page).click();
  await expect(page.getByRole("alert", { name: "Ошибка запуска" })).toContainText(
    "мог продолжить выполнение",
  );
  await expect(page.getByLabel("Namespace", { exact: true })).toHaveValue("production");
  await expect(acknowledgement(page)).not.toBeChecked();
  await expect(runButton(page)).toBeDisabled();
  await page.getByRole("button", { name: "Обновить", exact: true }).click();
  await expect(page.getByText("CrewAI отвечает: ok", { exact: true })).toBeVisible();
  expect(writes).toBe(1);
});

test("empty discovery is explicit while the server-default run remains available", async ({
  page,
}) => {
  await fixture(page, { flows: [], agents: [] });
  await page.goto("/automation");
  await expect(page.getByText("Flows не найдены", { exact: true })).toBeVisible();
  await expect(page.getByText("Агенты не найдены", { exact: true })).toBeVisible();
  await acknowledgement(page).check();
  await expect(runButton(page)).toBeEnabled();
});

test("unconfigured CrewAI is local to automation and does not break projects", async ({ page }) => {
  await page.route("**/api/automation/**", (route) =>
    route.fulfill({
      status: 503,
      json: { detail: "Подключение к API не настроено на сервере UI" },
    }),
  );
  await page.route("**/api/backend/projects", (route) => route.fulfill({ json: [] }));
  await page.goto("/automation");
  await expect(page.getByText(/CREWAI_API_URL/)).toBeVisible();
  await expect(page.getByRole("alert", { name: "Ошибка загрузки" }).first()).toBeVisible();
  await expect(page.getByText("Flows не найдены", { exact: true })).toHaveCount(0);
  await acknowledgement(page).check();
  await expect(runButton(page)).toBeDisabled();
  await page.getByRole("link", { name: "Проекты", exact: true }).click();
  await expect(page.getByText("Пока нет проектов", { exact: true })).toBeVisible();
});

test("failed catalog refresh keeps discovered flows with an honest stale notice", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/automation");
  await expect(page.getByRole("list", { name: "Доступные flows" })).toContainText("infra-health");
  await page.route("**/api/automation/flows", (route) =>
    route.fulfill({ status: 502, json: { detail: "Unavailable" } }),
  );
  await page.getByRole("button", { name: "Обновить", exact: true }).click();
  await expect(page.getByText(/Показаны последние полученные данные/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Доступные flows" })).toContainText("infra-health");
});

for (const width of [320, 390, 1440]) {
  test(`automation results and four navigation items fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const longName = "a".repeat(120);
    await fixture(page, { flows: [longName], agents: ["agent_" + "x".repeat(160)] });
    await page.route("**/api/automation/run", (route) =>
      route.fulfill({
        json: {
          ...result,
          final_answer: "answer".repeat(300),
          steps: [{ ...result.steps[0], output: "output".repeat(300) }],
          metadata: { trace_id: "f".repeat(32), other: "metadata".repeat(300) },
        },
      }),
    );
    await page.goto("/automation");
    await expect(page.getByText("CrewAI отвечает: ok", { exact: true })).toBeVisible();
    await acknowledgement(page).check();
    await runButton(page).click();
    await expect(
      page.getByRole("heading", { name: "Результат запуска", exact: true }),
    ).toBeVisible();
    await page.getByText("k8s_pods_overview", { exact: false }).click();
    await page.getByText("Метаданные", { exact: true }).click();
    const geometry = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.client);
    for (const name of ["Проекты", "Быстрый чат", "Автоматизация", "Настройки"])
      await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  });
}

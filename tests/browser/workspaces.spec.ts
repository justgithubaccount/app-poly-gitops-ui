import { expect, test, type Page } from "@playwright/test";

const id = "8cb03ff9-aef6-447a-a5f1-03d391f0ba36";

async function fixture(page: Page) {
  const projects: { id: string; name: string }[] = [];
  await page.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/backend/", "");
    const method = route.request().method();
    if (path === "projects" && method === "GET") return route.fulfill({ json: projects });
    if (path === "projects" && method === "POST") {
      const item = { id, name: route.request().postDataJSON().name as string };
      projects.push(item);
      return route.fulfill({ json: item });
    }
    if (path.endsWith("/chat") || path === "chat")
      return route.fulfill({ json: { reply: "Это проверяемый ответ тестового API." } });
    if (path.endsWith("/history"))
      return route.fulfill({
        json: [
          {
            id: "request-fixture",
            project_id: id,
            timestamp: "2026-10-29T10:00:00Z",
            trace_id: "0123456789abcdef0123456789abcdef",
            span_id: null,
            messages: [
              { role: "user", content: "Проверка проекта", timestamp: "2026-10-29T10:00:00Z" },
            ],
          },
        ],
      });
    if (path === "health") return route.fulfill({ json: { status: "ok" } });
    if (path === "behavior/schema")
      return route.fulfill({ status: 404, json: { detail: "Behavior not loaded" } });
    return route.fulfill({ status: 404, json: { detail: "Missing test fixture" } });
  });
}

test("create a project, send a message and inspect request evidence", async ({ page }) => {
  await fixture(page);
  await page.goto("/");
  await expect(page.getByText("Пока нет проектов", { exact: true })).toBeVisible();
  await page.getByLabel("Название проекта").fill("Исследование API");
  await page.getByRole("button", { name: "Создать проект" }).click();
  await page.getByRole("link", { name: /Исследование API/ }).click();
  await page.getByLabel("Сообщение", { exact: true }).fill("Проверка проекта");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(page.getByText("Это проверяемый ответ тестового API.")).toBeVisible();
  await expect(page.getByLabel("Сообщение", { exact: true })).toBeFocused();
  await page.getByText("История запросов проекта", { exact: true }).click();
  await expect(page.getByText("trace_id: 0123456789abcdef0123456789abcdef")).toBeVisible();
  await expect(page.getByText(/не полная история ответов/)).toBeVisible();
});

test("a failed load stays an error and a manual retry recovers", async ({ page }) => {
  await page.route("**/api/backend/projects", (route) =>
    route.fulfill({ status: 500, json: { detail: "Database temporarily unavailable" } }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert", { name: "Ошибка загрузки" })).toContainText(
    "Database temporarily unavailable",
  );
  await expect(page.getByText("Пока нет проектов", { exact: true })).toHaveCount(0);
  await page.unroute("**/api/backend/projects");
  await page.route("**/api/backend/projects", (route) => route.fulfill({ json: [] }));
  await page.getByRole("button", { name: "Повторить загрузку" }).click();
  await expect(page.getByText("Пока нет проектов", { exact: true })).toBeVisible();
});

test("failed background refresh preserves real rows with a stale notice", async ({ page }) => {
  await page.route("**/api/backend/projects", (route) =>
    route.fulfill({ json: [{ id, name: "Сохранённый проект" }] }),
  );
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Сохранённый проект/ })).toBeVisible();
  await page.unroute("**/api/backend/projects");
  await page.route("**/api/backend/projects", (route) =>
    route.fulfill({ status: 503, json: { detail: "Unavailable" } }),
  );
  await page.getByRole("button", { name: "Обновить", exact: true }).click();
  await expect(page.getByText(/Показаны последние полученные данные/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Сохранённый проект/ })).toBeVisible();
});

test("failed chat keeps the draft and never automatically resends POST", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/backend/chat", (route) => {
    requests += 1;
    return route.fulfill({ status: 504, json: { detail: "Время ожидания истекло" } });
  });
  await page.goto("/chat");
  await page.getByLabel("Сообщение", { exact: true }).fill("Не терять черновик");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Ошибка отправки" })).toContainText(
    "Время ожидания истекло",
  );
  await expect(page.getByLabel("Сообщение", { exact: true })).toHaveValue("Не терять черновик");
  await expect(page.getByRole("button", { name: "Отправить", exact: true })).toBeEnabled();
  expect(requests).toBe(1);
});

test("theme keyboard selection persists and optional behavior 404 is honest", async ({ page }) => {
  await fixture(page);
  await page.goto("/settings");
  await expect(page.getByText("Схема поведения не загружена", { exact: true })).toBeVisible();
  await expect(page.getByText(/Доступность LLM этим не проверена/)).toBeVisible();
  await page.getByRole("radio", { name: "Светлая", exact: true }).click();
  await page.getByRole("radio", { name: "Светлая", exact: true }).press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Тёмная", exact: true })).toBeChecked();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("radio", { name: "Тёмная", exact: true })).toBeChecked();
});

for (const width of [320, 390, 1440]) {
  test(`workspaces fit ${width}px without hiding horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await fixture(page);
    for (const path of ["/", "/chat", "/settings"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Основная навигация" })).toBeVisible();
      const geometry = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.client);
    }
  });
}

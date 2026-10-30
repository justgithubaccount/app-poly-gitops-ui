// Explicit local check against a separately started REAL FastAPI with the
// loopback provider fixture. There are no browser request mocks here.
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const base = "http://127.0.0.1:3100";
const destination = "test-results/actual-stack";
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await mkdir(destination, { recursive: true });
  await page.goto(base);
  await page.getByLabel("Название проекта").fill("Исследование Chat API");
  const creation = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/backend/projects" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Создать проект" }).click();
  const createdResponse = await creation;
  expect(createdResponse.status()).toBe(200);
  const created = await createdResponse.json();
  const projectPath = `/projects/${created.id}`;
  await page.locator(`a[href="${projectPath}"]`).click();
  await expect(page).toHaveURL(`${base}${projectPath}`);
  await page.getByLabel("Сообщение", { exact: true }).fill("Проверка приложения");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(
    page.getByText("Локальная проверка: Проверка приложения", { exact: true }),
  ).toBeVisible();
  await page.getByText("История запросов проекта", { exact: true }).click();
  await expect(page.getByText(/user: Проверка приложения/)).toBeVisible();
  await page.screenshot({ path: `${destination}/project-desktop-light.png`, fullPage: true });

  await page.goto(`${base}/settings`);
  await expect(page.getByText(/API отвечает: ok/)).toBeVisible();
  await expect(page.getByText("Схема поведения не загружена", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Тёмная", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: `${destination}/settings-desktop-dark.png`, fullPage: true });
  await page.goto(`${base}${projectPath}`);
  await page.getByText("История запросов проекта", { exact: true }).click();
  await expect(page.getByText(/user: Проверка приложения/)).toBeVisible();
  await expect(page.getByText(/assistant: Локальная проверка: Проверка приложения/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${destination}/project-mobile-dark.png`, fullPage: true });
  expect(errors).toEqual([]);
  console.log(
    JSON.stringify({
      result: "PASS",
      stack: "browser -> Next proxy -> real FastAPI -> explicit loopback LLM fixture",
      persistedTranscriptVerified: true,
      provider: "fixture",
      projectPath,
      screenshots: destination,
    }),
  );
} finally {
  await browser.close();
}

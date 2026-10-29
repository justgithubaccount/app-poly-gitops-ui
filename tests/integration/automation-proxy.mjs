// Real browser -> real Next route -> explicit loopback HTTP fixture.
// This does not execute CrewAI, contact an LLM or touch a cluster.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

const writes = [];
const fixtureResult = {
  final_answer: "HTTP fixture result — no real flow executed",
  steps: [
    { agent: "observer", task: "fixture_check", output: "Explicit local fixture", duration_ms: 3 },
  ],
  metadata: { total_duration_ms: 5, trace_id: "0123456789abcdef0123456789abcdef" },
};
const upstream = createServer(async (request, response) => {
  let payload;
  if (request.method === "GET" && request.url === "/health") payload = { status: "ok" };
  else if (request.method === "GET" && request.url === "/flows")
    payload = { flows: ["fixture-flow"] };
  else if (request.method === "GET" && request.url === "/agents")
    payload = { agents: ["observer"] };
  else if (request.method === "POST" && ["/run", "/run/fixture-flow"].includes(request.url)) {
    let body = "";
    for await (const chunk of request) body += chunk;
    writes.push({
      path: request.url,
      body: JSON.parse(body),
      cookie: request.headers.cookie,
      authorization: request.headers.authorization,
    });
    payload = fixtureResult;
  } else {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ detail: "No HTTP fixture for this request" }));
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
});

let child;
let browser;
let childExited;
try {
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const fixtureUrl = `http://127.0.0.1:${upstream.address().port}`;
  const portReservation = createServer();
  portReservation.listen(0, "127.0.0.1");
  await once(portReservation, "listening");
  const port = portReservation.address().port;
  await new Promise((resolve) => portReservation.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      env: { ...process.env, CREWAI_API_URL: fixtureUrl, CREWAI_API_TIMEOUT_MS: "120000" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  childExited = once(child, "exit");
  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs = (logs + chunk).slice(-4000);
  });
  child.stderr.on("data", (chunk) => {
    logs = (logs + chunk).slice(-4000);
  });
  const deadline = Date.now() + 30000;
  while (true) {
    if (child.exitCode !== null) throw new Error(`Preview server exited: ${logs}`);
    try {
      const response = await fetch(`${base}/automation`);
      if (response.ok) break;
    } catch {
      /* Server startup is not instantaneous. */
    }
    if (Date.now() > deadline) throw new Error(`Preview server was not ready: ${logs}`);
    await delay(150);
  }

  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  const context = await browser.newContext();
  await context.addCookies([{ name: "ui-private", value: "must-not-forward", url: base }]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/automation`);
  await expect(page.getByText("CrewAI отвечает: ok", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Агенты" })).toContainText("observer");
  await page.getByLabel("Flow", { exact: true }).selectOption("fixture-flow");
  await page.getByLabel("Namespace", { exact: true }).fill("integration");
  await page.getByLabel("Имя приложения", { exact: true }).fill("chat-api");
  await page.getByLabel("Контекст (JSON)", { exact: true }).fill('{"question":"fixture only"}');
  await page.getByRole("checkbox", { name: /Понимаю, что flow/ }).check();
  await page.getByRole("button", { name: "Запустить flow", exact: true }).click();
  await expect(page.getByText(fixtureResult.final_answer, { exact: true })).toBeVisible();
  await page.getByText("1. fixture_check", { exact: false }).click();
  await expect(page.getByText("Explicit local fixture", { exact: true })).toBeVisible();
  assert.deepEqual(writes, [
    {
      path: "/run/fixture-flow",
      body: {
        namespace: "integration",
        app_name: "chat-api",
        context: { question: "fixture only" },
      },
      cookie: undefined,
      authorization: undefined,
    },
  ]);

  const invalid = await fetch(`${base}/api/automation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ namespace: "integration", context: { namespace: "hidden" } }),
  });
  assert.equal(invalid.status, 422);
  const crossOrigin = await fetch(`${base}/api/automation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://other.test" },
    body: JSON.stringify({ namespace: "integration" }),
  });
  assert.equal(crossOrigin.status, 403);
  assert.equal(writes.length, 1);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      result: "PASS",
      stack: "browser -> real Next proxy -> explicit loopback HTTP fixture",
      targetAndContextVerified: true,
      browserCredentialsNotForwarded: true,
      originAndOverrideGuardsVerified: true,
      realCrewAiExecuted: false,
    }),
  );
} finally {
  if (browser) await browser.close();
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([childExited, delay(5000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  upstream.closeAllConnections();
  await new Promise((resolve) => upstream.close(resolve));
}

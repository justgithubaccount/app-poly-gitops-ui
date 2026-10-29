import { afterEach, describe, expect, it, vi } from "vitest";
import { automationRequest } from "./client";
import { automationPath, proxyAutomationRequest } from "./automation-proxy";
import {
  agentsSchema,
  flowsSchema,
  parseRunContext,
  runRequestSchema,
  runResponseSchema,
} from "./automation-schemas";

const env = { CREWAI_API_URL: "http://127.0.0.1:8001" };
const result = {
  final_answer: "Cluster summary",
  steps: [{ agent: "observer", task: "pods", output: "Ready", duration_ms: 12 }],
  metadata: { total_duration_ms: 15, trace_id: "0123456789abcdef0123456789abcdef" },
};
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3100/api/automation/run/infra-health", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

afterEach(() => vi.unstubAllGlobals());

describe("automation contracts", () => {
  it("validates actual discovery/results without fabricating missing fields", () => {
    expect(flowsSchema.parse({ flows: ["infra-health"] }).flows).toEqual(["infra-health"]);
    expect(agentsSchema.parse({ agents: ["observer"] }).agents).toEqual(["observer"]);
    expect(runResponseSchema.parse(result).steps[0].duration_ms).toBe(12);
    expect(runResponseSchema.safeParse({ final_answer: "ok" }).success).toBe(false);
    expect(runResponseSchema.safeParse({ ...result, steps: [{ output: "ok" }] }).success).toBe(
      false,
    );
    expect(flowsSchema.safeParse({ flows: ["../private"] }).success).toBe(false);
  });

  it("accepts optional object context but rejects arrays, scalars and target overrides", () => {
    expect(parseRunContext("  ")).toBeUndefined();
    expect(parseRunContext('{"question":"Why?","limit":4}')).toEqual({
      question: "Why?",
      limit: 4,
    });
    for (const input of [
      "[]",
      "null",
      '"text"',
      "{",
      '{"namespace":"other"}',
      '{"app_name":"other"}',
    ]) {
      expect(() => parseRunContext(input)).toThrow();
    }
    expect(runRequestSchema.parse({ namespace: " prod ", app_name: "chat-api" })).toEqual({
      namespace: "prod",
      app_name: "chat-api",
    });
    for (const context of [{ namespace: "other" }, { app_name: "other" }, []]) {
      expect(runRequestSchema.safeParse({ namespace: "prod", context }).success).toBe(false);
    }
    expect(runRequestSchema.safeParse({ namespace: " " }).success).toBe(false);
  });

  it("uses the automation client path and preserves FastAPI errors", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ flows: ["infra-health"] }))
      .mockResolvedValueOnce(
        Response.json({ detail: [{ msg: "Invalid namespace" }] }, { status: 422 }),
      )
      .mockResolvedValueOnce(Response.json({ flows: "invalid" }));
    vi.stubGlobal("fetch", fetcher);
    expect(await automationRequest("flows", flowsSchema)).toEqual({ flows: ["infra-health"] });
    expect(fetcher.mock.calls[0][0]).toBe("/api/automation/flows");
    await expect(
      automationRequest("run", runResponseSchema, { method: "POST", body: "{}" }),
    ).rejects.toThrow("Invalid namespace");
    await expect(automationRequest("flows", flowsSchema)).rejects.toThrow(
      "Ответ API не соответствует контракту",
    );
  });
});

describe("bounded automation proxy", () => {
  it("routes the five existing endpoints and nothing outside that contract", () => {
    for (const name of ["health", "flows", "agents"])
      expect(automationPath("GET", [name])).toBe(`/${name}`);
    expect(automationPath("POST", ["run"])).toBe("/run");
    expect(automationPath("POST", ["run", "infra-health"])).toBe("/run/infra-health");
    for (const path of [
      ["..", "health"],
      ["run", ".."],
      ["run", "a/b"],
      ["run", "a?token=1"],
      ["run", "a%2Fb"],
      ["run", "x", "extra"],
      ["openapi.json"],
    ]) {
      expect(automationPath("POST", path)).toBeNull();
    }
    expect(automationPath("GET", ["run"])).toBeNull();
    expect(automationPath("DELETE", ["flows"])).toBeNull();
  });

  it("forwards validated targets only to the configured CrewAI service", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(result));
    const response = await proxyAutomationRequest(
      post(
        { namespace: " prod ", app_name: "chat-api", context: { question: "Why?" } },
        {
          cookie: "private=token",
          authorization: "Bearer private",
          origin: "http://localhost:3100",
        },
      ),
      ["run", "infra-health"],
      fetcher,
      env,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe("http://127.0.0.1:8001/run/infra-health");
    expect(JSON.parse(init?.body as string)).toEqual({
      namespace: "prod",
      app_name: "chat-api",
      context: { question: "Why?" },
    });
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(init?.redirect).toBe("error");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("supports server-default execution without guessing the default flow", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(result));
    expect(
      (await proxyAutomationRequest(post({ namespace: "default" }), ["run"], fetcher, env)).status,
    ).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toBe("http://127.0.0.1:8001/run");
  });

  it("rejects invalid JSON targets/context, oversized bodies and cross-origin writes before upstream", async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const body of [
      { namespace: "" },
      { namespace: "prod", context: [] },
      { namespace: "prod", context: { namespace: "secret" } },
      { namespace: "prod", context: { app_name: "other" } },
    ]) {
      expect((await proxyAutomationRequest(post(body), ["run"], fetcher, env)).status).toBe(422);
    }
    expect(
      (
        await proxyAutomationRequest(
          post({ namespace: "prod" }, { origin: "https://other.test" }),
          ["run"],
          fetcher,
          env,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await proxyAutomationRequest(
          post({ namespace: "prod" }, { "content-type": "text/plain" }),
          ["run"],
          fetcher,
          env,
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await proxyAutomationRequest(
          new Request("http://localhost/api/automation/run", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{",
          }),
          ["run"],
          fetcher,
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await proxyAutomationRequest(
          post({ namespace: "prod", context: { text: "x".repeat(1_000_001) } }),
          ["run"],
          fetcher,
          env,
        )
      ).status,
    ).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps missing/invalid CrewAI configuration local and does not disclose it", async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const config of [
      {},
      { CREWAI_API_URL: "file:///etc/passwd" },
      { CREWAI_API_URL: "https://user:secret@example.test" },
      { ...env, CREWAI_API_TIMEOUT_MS: "999999" },
    ]) {
      const response = await proxyAutomationRequest(
        new Request("http://localhost/api/automation/flows"),
        ["flows"],
        fetcher,
        config,
      );
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain("secret");
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("never retries a timeout or claims that upstream execution stopped", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    const response = await proxyAutomationRequest(
      post({ namespace: "default" }),
      ["run"],
      fetcher,
      env,
    );
    expect(response.status).toBe(504);
    expect(await response.text()).toContain("мог продолжить выполнение");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reports unreachable and non-JSON upstream replies honestly", async () => {
    for (const failure of [
      vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 })),
    ]) {
      const response = await proxyAutomationRequest(
        new Request("http://localhost/api/automation/flows"),
        ["flows"],
        failure,
        env,
      );
      expect(response.status).toBe(502);
      expect(await response.text()).toContain("недоступен");
    }
  });
});

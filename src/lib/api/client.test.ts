import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { historySchema, projectsSchema } from "./schemas";

afterEach(() => vi.unstubAllGlobals());

describe("FastAPI contract boundary", () => {
  it("reports FastAPI validation failures rather than an empty result", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ detail: [{ msg: "Field required" }] }, { status: 422 })),
    );
    await expect(apiRequest("projects", projectsSchema)).rejects.toThrow("Field required");
  });
  it("rejects malformed successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ items: [] })));
    await expect(apiRequest("projects", projectsSchema)).rejects.toThrow(
      "Ответ API не соответствует контракту",
    );
  });
  it("accepts nullable tracing fields and preserves distinct request snapshots", () => {
    const row = {
      id: "request-a",
      project_id: "project",
      messages: [{ role: "user", content: "hello", timestamp: "2026-10-29T10:00:00Z" }],
      timestamp: "2026-10-29T10:00:00Z",
      trace_id: null,
      span_id: null,
    };
    const parsed = historySchema.parse([row, { ...row, id: "request-b" }]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].messages).toHaveLength(1);
    expect(parsed[0].trace_id).toBeNull();
  });
});

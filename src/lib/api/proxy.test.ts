import { describe, expect, it, vi } from "vitest";
import { backendPath, proxyBackendRequest } from "./proxy";

const env = { CHAT_API_URL: "http://127.0.0.1:8000" };

describe("bounded backend proxy", () => {
  it("does not route arbitrary paths, methods, URLs or traversal", () => {
    for (const segments of [
      ["http:", "attacker.test"],
      ["..", "health"],
      ["projects", "..", "chat"],
      ["openapi.json"],
    ]) {
      expect(backendPath("GET", segments)).toBeNull();
    }
    expect(backendPath("DELETE", ["projects"])).toBeNull();
  });
  it("forwards only validated JSON to the fixed upstream, without browser credentials", async () => {
    const request = new Request("http://localhost:3100/api/backend/projects", {
      method: "POST",
      headers: {
        origin: "http://localhost:3100",
        "content-type": "application/json",
        cookie: "private=token",
        authorization: "Bearer private",
      },
      body: JSON.stringify({ name: " Test ", userApiKey: "must-not-forward" }),
    });
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: "id", name: "Test" }));
    const response = await proxyBackendRequest(request, ["projects"], fetcher, env);
    expect(response.status).toBe(200);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe("http://127.0.0.1:8000/api/v1/projects");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(init?.body).toBe('{"name":"Test"}');
    expect(init?.redirect).toBe("error");
  });
  it("rejects cross-origin writes before any network call", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const request = new Request("http://localhost:3100/api/backend/projects", {
      method: "POST",
      headers: { origin: "https://other.test", "content-type": "application/json" },
      body: '{"name":"Test"}',
    });
    expect((await proxyBackendRequest(request, ["projects"], fetcher, env)).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("accepts the actual request Host when Next uses an internal hostname in Request.url", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: "id", name: "Test" }));
    const request = new Request("http://localhost:3100/api/backend/projects", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3100",
        origin: "http://127.0.0.1:3100",
        "content-type": "application/json",
      },
      body: '{"name":"Test"}',
    });
    expect((await proxyBackendRequest(request, ["projects"], fetcher, env)).status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("reports missing or invalid upstream configuration without leaking it", async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const invalid of [
      {},
      { CHAT_API_URL: "file:///etc/passwd" },
      { CHAT_API_URL: "https://user:secret@example.test" },
    ]) {
      const response = await proxyBackendRequest(
        new Request("http://localhost/api/backend/health"),
        ["health"],
        fetcher,
        invalid,
      );
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain("secret");
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not retry a timed-out write or claim cancellation", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    const request = new Request("http://localhost/api/backend/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"name":"Test"}',
    });
    const response = await proxyBackendRequest(request, ["projects"], fetcher, env);
    expect(response.status).toBe(504);
    expect(await response.text()).toContain("мог продолжить выполнение");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

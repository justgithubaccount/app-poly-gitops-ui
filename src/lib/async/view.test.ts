import { describe, expect, it } from "vitest";
import { resolveAsyncView } from "./view";

describe("read state", () => {
  it("does not turn unavailable data into empty or zero", () => {
    expect(resolveAsyncView(undefined, undefined, true).phase).toBe("loading");
    expect(resolveAsyncView(undefined, new Error("500"), false).phase).toBe("error");
    expect(resolveAsyncView([], undefined, false, (data) => data.length === 0).phase).toBe("empty");
  });
  it("keeps last good data after a failed background refresh, including a real empty result", () => {
    expect(resolveAsyncView([1], new Error("500"), false)).toEqual({
      phase: "ready",
      refreshing: false,
      stale: true,
    });
    expect(resolveAsyncView([], new Error("500"), false, (data) => data.length === 0)).toEqual({
      phase: "empty",
      refreshing: false,
      stale: true,
    });
  });
});

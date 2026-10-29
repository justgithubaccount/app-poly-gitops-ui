export type ReadPhase = "loading" | "error" | "empty" | "ready";

export function resolveAsyncView<T>(
  data: T | undefined,
  error: unknown,
  refreshing: boolean,
  isEmpty: (value: T) => boolean = () => false,
) {
  if (data === undefined) {
    return { phase: error ? "error" : "loading", refreshing: false, stale: false } as const;
  }
  return {
    phase: isEmpty(data) ? "empty" : "ready",
    refreshing,
    stale: Boolean(error),
  } as const;
}

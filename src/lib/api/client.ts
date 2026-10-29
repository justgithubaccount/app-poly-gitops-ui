import { z } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorDetail(body: unknown, status: number): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = body.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const issues = z.array(z.object({ msg: z.string() })).safeParse(detail);
      if (issues.success) return issues.data.map((issue) => issue.msg).join("; ");
    }
  }
  return `API вернул ошибку ${status}`;
}

async function requestService<T>(
  service: "backend" | "automation",
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/${service}/${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(errorDetail(body, response.status), response.status);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError("Ответ API не соответствует контракту", 502);
  return parsed.data;
}

export function apiRequest<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  return requestService("backend", path, schema, init);
}

export function automationRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  return requestService("automation", path, schema, init);
}

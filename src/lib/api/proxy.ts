import { z } from "zod";
import { chatRequestSchema, createProjectSchema } from "./schemas";

const projectId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function backendPath(method: string, segments: string[]): string | null {
  const path = segments.join("/");
  if (method === "GET" && path === "health") return "/health";
  if (method === "GET" && path === "service") return "/";
  if (method === "GET" && path === "behavior/schema") return "/api/v1/behavior/schema";
  if (["GET", "POST"].includes(method) && path === "projects") return "/api/v1/projects";
  if (method === "POST" && path === "chat") return "/api/v1/chat";
  if (segments.length === 3 && segments[0] === "projects" && projectId.test(segments[1])) {
    if (method === "GET" && segments[2] === "history") return `/api/v1/${path}`;
    if (method === "POST" && segments[2] === "chat") return `/api/v1/${path}`;
  }
  return null;
}

const upstreamSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    ["http:", "https:"].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    url.pathname === "/"
  );
});

type ProxyEnvironment = {
  CHAT_API_URL?: string;
  CHAT_API_TIMEOUT_MS?: string;
};

export async function proxyBackendRequest(
  request: Request,
  segments: string[],
  fetcher: typeof fetch = fetch,
  env: ProxyEnvironment = {
    CHAT_API_URL: process.env.CHAT_API_URL,
    CHAT_API_TIMEOUT_MS: process.env.CHAT_API_TIMEOUT_MS,
  },
): Promise<Response> {
  const path = backendPath(request.method, segments);
  if (!path) return Response.json({ detail: "Маршрут API не поддерживается" }, { status: 404 });

  const configured = upstreamSchema.safeParse(env.CHAT_API_URL);
  const timeout = z.coerce
    .number()
    .int()
    .min(1000)
    .max(120000)
    .safeParse(env.CHAT_API_TIMEOUT_MS ?? "70000");
  if (!configured.success || !timeout.success) {
    return Response.json(
      { detail: "Подключение к API не настроено на сервере UI" },
      { status: 503 },
    );
  }

  let body: string | undefined;
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    const requestUrl = new URL(request.url);
    // Next can reconstruct Request.url with its internal hostname. The Host
    // header retains the authority actually requested by the browser.
    const host = request.headers.get("host") ?? requestUrl.host;
    const expectedOrigin = new URL(`${requestUrl.protocol}//${host}`).origin;
    if (origin && origin !== expectedOrigin) {
      return Response.json({ detail: "Недопустимый источник запроса" }, { status: 403 });
    }
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return Response.json({ detail: "Требуется application/json" }, { status: 415 });
    }
    const raw = await request.text();
    if (raw.length > 1_000_000) {
      return Response.json({ detail: "Запрос слишком большой" }, { status: 413 });
    }
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      return Response.json({ detail: "Некорректный JSON" }, { status: 400 });
    }
    const schema = path === "/api/v1/projects" ? createProjectSchema : chatRequestSchema;
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return Response.json({ detail: "Проверьте поля запроса" }, { status: 422 });
    }
    body = JSON.stringify(parsed.data);
  }

  try {
    const response = await fetcher(new URL(path, configured.data), {
      method: request.method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(timeout.data),
    });
    const payload: unknown = await response.json();
    return Response.json(payload, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    return Response.json(
      {
        detail: timedOut
          ? "API не ответил вовремя. Запрос мог продолжить выполнение."
          : "API сейчас недоступен",
      },
      { status: timedOut ? 504 : 502 },
    );
  }
}

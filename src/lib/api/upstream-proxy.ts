import { z } from "zod";

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

type UpstreamOptions = {
  path: string | null;
  bodySchema?: z.ZodType;
  url?: string;
  timeout?: string;
  defaultTimeout: number;
  maxTimeout: number;
};

// Transport is shared; each service supplies its own route/body allowlist.
export async function proxyUpstreamRequest(
  request: Request,
  options: UpstreamOptions,
  fetcher: typeof fetch,
): Promise<Response> {
  if (!options.path) {
    return Response.json({ detail: "Маршрут API не поддерживается" }, { status: 404 });
  }
  const configured = upstreamSchema.safeParse(options.url);
  const timeout = z.coerce
    .number()
    .int()
    .min(1000)
    .max(options.maxTimeout)
    .safeParse(options.timeout ?? options.defaultTimeout);
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
    // Next may use an internal hostname; Host retains the browser authority.
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
    const parsed = options.bodySchema?.safeParse(input);
    if (!parsed?.success) {
      return Response.json({ detail: "Проверьте поля запроса" }, { status: 422 });
    }
    body = JSON.stringify(parsed.data);
  }

  try {
    const response = await fetcher(new URL(options.path, configured.data), {
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

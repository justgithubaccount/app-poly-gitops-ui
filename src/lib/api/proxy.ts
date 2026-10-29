import { chatRequestSchema, createProjectSchema } from "./schemas";
import { proxyUpstreamRequest } from "./upstream-proxy";

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
  return proxyUpstreamRequest(
    request,
    {
      path,
      bodySchema: path === "/api/v1/projects" ? createProjectSchema : chatRequestSchema,
      url: env.CHAT_API_URL,
      timeout: env.CHAT_API_TIMEOUT_MS,
      defaultTimeout: 70000,
      maxTimeout: 120000,
    },
    fetcher,
  );
}

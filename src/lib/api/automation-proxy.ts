import { flowNameSchema, runRequestSchema } from "./automation-schemas";
import { proxyUpstreamRequest } from "./upstream-proxy";

export function automationPath(method: string, segments: string[]): string | null {
  if (segments.length === 1) {
    if (method === "GET" && ["health", "flows", "agents"].includes(segments[0])) {
      return `/${segments[0]}`;
    }
    if (method === "POST" && segments[0] === "run") return "/run";
  }
  if (
    method === "POST" &&
    segments.length === 2 &&
    segments[0] === "run" &&
    flowNameSchema.safeParse(segments[1]).success
  ) {
    return `/run/${segments[1]}`;
  }
  return null;
}

type AutomationEnvironment = {
  CREWAI_API_URL?: string;
  CREWAI_API_TIMEOUT_MS?: string;
};

export function proxyAutomationRequest(
  request: Request,
  segments: string[],
  fetcher: typeof fetch = fetch,
  env: AutomationEnvironment = {
    CREWAI_API_URL: process.env.CREWAI_API_URL,
    CREWAI_API_TIMEOUT_MS: process.env.CREWAI_API_TIMEOUT_MS,
  },
): Promise<Response> {
  return proxyUpstreamRequest(
    request,
    {
      path: automationPath(request.method, segments),
      bodySchema: runRequestSchema,
      url: env.CREWAI_API_URL,
      timeout: env.CREWAI_API_TIMEOUT_MS,
      defaultTimeout: 120000,
      maxTimeout: 300000,
    },
    fetcher,
  );
}

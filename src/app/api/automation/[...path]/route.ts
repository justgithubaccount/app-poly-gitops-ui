import "server-only";
import { proxyAutomationRequest } from "@/lib/api/automation-proxy";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyAutomationRequest(request, path);
}

export const GET = handle;
export const POST = handle;

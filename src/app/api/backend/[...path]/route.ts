import "server-only";
import { proxyBackendRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyBackendRequest(request, path);
}

export const GET = handle;
export const POST = handle;

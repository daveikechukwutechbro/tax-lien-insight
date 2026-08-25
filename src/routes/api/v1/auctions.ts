import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(request: Request): Promise<Response> {
  return proxyToBackend(request);
}

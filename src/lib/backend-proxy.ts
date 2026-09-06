/**
 * Server-side proxy from the TanStack app's /api/v1 routes to the independently
 * deployed backend service. The backend is the source of truth; the frontend app
 * forwards requests (including cookies/headers) so auth/session cookies propagate.
 */
const BACKEND_URL =
  (import.meta.env?.VITE_BACKEND_API_URL as string | undefined) ??
  (typeof process !== "undefined" ? process.env.BACKEND_API_URL : undefined) ??
  "https://tax-lien-insight-backend.daveikechukwutechbro.workers.dev";

export async function proxyToBackend(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, BACKEND_URL);
  const headers = new Headers(request.headers);
  // Ensure host header points at the backend, not the original.
  headers.delete("host");
  // Let the fetch layer recompute framing for the forwarded body.
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body as unknown as ReadableStream;
    init.duplex = "half";
  }
  const upstream = await fetch(target.toString(), init);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

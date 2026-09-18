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
  // Fail fast instead of letting a slow/cold upstream hang the request and
  // produce a non-JSON 5xx (which the client can't parse into an envelope).
  init.signal = AbortSignal.timeout(9000);
  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), init);
  } catch {
    return jsonError(
      504,
      "UPSTREAM_TIMEOUT",
      "The service is taking too long to respond. Please try again.",
    );
  }
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("connection");
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(
    JSON.stringify({ success: false, data: null, error: { code, message }, meta: {} }),
    {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}

import type { ApiResponse } from "@/integrations/firebase/mock";

export async function GET(): Promise<Response> {
  const body: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: { status: "ok", timestamp: new Date().toISOString() },
    error: null,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

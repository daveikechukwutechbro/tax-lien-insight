import { mockSupabase } from "@/integrations/firebase/mock";
import type { ApiResponse } from "@/integrations/firebase/mock";

export async function GET(): Promise<Response> {
  const reqUrl = new URL(globalThis?.location?.pathname ?? "/");
  const params = new URLSearchParams(reqUrl.search);
  const state = params.get("state");

  if (!state) {
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: { code: "MISSING_PARAM", message: "Query parameter 'state' is required." },
      } as ApiResponse<null>),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = await mockSupabase.rpc("get_jurisdiction_rules", { _state: state });
  const { data, error } = result as { data: unknown; error: { message: string } | null };

  const body: ApiResponse<unknown> = error
    ? {
        success: false,
        data: null,
        error: { code: "JURISDICTION_NOT_FOUND", message: error.message },
      }
    : { success: true, data, error: null };

  const status = error ? 500 : 200;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

import { mockSupabase } from "@/integrations/firebase/mock";
import type { ApiResponse } from "@/integrations/firebase/mock";

export async function GET(): Promise<Response> {
  const result = await mockSupabase.from("counties").select("*");
  const { data, error } = result as { data: unknown; error: { message: string } | null };
  const body: ApiResponse<unknown> = error
    ? { success: false, data: null, error: { code: "INTERNAL_ERROR", message: error.message } }
    : { success: true, data, error: null };
  return new Response(JSON.stringify(body), {
    status: error ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
}

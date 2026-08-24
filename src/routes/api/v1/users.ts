import { mockSupabase } from "@/integrations/firebase/mock";
import type { ApiResponse } from "@/integrations/firebase/mock";

export async function GET(): Promise<Response> {
  const result = await mockSupabase
    .from("profiles")
    .select("id, full_name, email, account_balance, verified, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const { data: profiles, error } = result as {
    data: unknown[] | null;
    error: { message: string } | null;
  };

  const body: ApiResponse<unknown> = error
    ? { success: false, data: null, error: { code: "INTERNAL_ERROR", message: error.message } }
    : { success: true, data: profiles ?? [], error: null, meta: { count: profiles?.length ?? 0 } };

  return new Response(JSON.stringify(body), {
    status: error ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/documents")({
  component: Documents,
});

function Documents() {
  const { data: docs = [] } = useQuery({
    queryKey: ["all-documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents")
        .select("*, property:properties(address, city, state)")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function download(path: string) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) return toast.error(error?.message ?? "Failed to download");
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy">Documents</h1>
      <p className="mt-1 text-sm text-ink-muted">Property title reports, tax records, and legal notices.</p>
      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        {docs.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No documents available.</p> :
          <ul className="divide-y divide-hairline">
            {docs.map((d) => {
              const p = d.property as { address?: string; city?: string; state?: string } | null;
              return (
                <li key={d.id} className="flex items-center gap-3 p-4">
                  <FileText className="size-5 text-navy" />
                  <div className="min-w-0 flex-1">
                    <div className="font-500 text-navy">{d.title}</div>
                    <div className="text-xs text-ink-muted">{d.kind}{p ? ` · ${p.address}, ${p.city}, ${p.state}` : ""}</div>
                  </div>
                  <button onClick={()=>download(d.file_path)} className="flex items-center gap-1 rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs font-600 text-navy hover:bg-surface-alt">
                    <Download className="size-3.5" /> Download
                  </button>
                </li>
              );
            })}
          </ul>
        }
      </div>
    </div>
  );
}

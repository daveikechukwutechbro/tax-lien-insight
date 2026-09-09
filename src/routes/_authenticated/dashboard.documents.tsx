import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyDocuments, getDocumentUrl } from "@/lib/backend";
import { FileText, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/documents")({
  component: Documents,
});

function Documents() {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: getMyDocuments,
  });
  const [opening, setOpening] = useState<string | null>(null);

  async function download(id: string) {
    setOpening(id);
    try {
      const url = await getDocumentUrl(id);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open document");
    } finally {
      setOpening(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy">Documents</h1>
      <p className="mt-1 text-sm text-ink-muted">Certificates, invoices, and verification documents issued to you.</p>
      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        {isLoading ? <p className="p-8 text-center text-sm text-ink-muted">Loading…</p> :
         docs.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No documents available.</p> :
          <ul className="divide-y divide-hairline">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 p-4">
                <FileText className="size-5 text-navy" />
                <div className="min-w-0 flex-1">
                  <div className="font-500 capitalize text-navy">{d.resource_type.replace(/_/g, " ")}</div>
                  <div className="text-xs text-ink-muted">{d.access_scope.replace(/_/g, " ")} · {new Date(d.created_at).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={() => download(d.id)}
                  disabled={opening === d.id}
                  className="flex items-center gap-1 rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs font-600 text-navy hover:bg-surface-alt disabled:opacity-60"
                >
                  <Download className="size-3.5" /> {opening === d.id ? "Opening…" : "Download"}
                </button>
              </li>
            ))}
          </ul>
        }
      </div>
    </div>
  );
}
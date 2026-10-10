import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getAdminSiteContent, saveAdminSiteContent, type SiteContent, SITE_CONTENT_SLUGS } from "@/lib/backend";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/content/pages")({
  component: PagesEditor,
});

function PagesEditor() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data } = useQuery({
    queryKey: ["admin", "content", "all"],
    queryFn: getAdminSiteContent,
  });
  const [slug, setSlug] = useState<SiteContent["slug"]>("home");
  const record = data?.find((c) => c.slug === slug) ?? { slug, body: {}, updatedAt: null };
  const [body, setBody] = useState<Record<string, unknown>>(record.body as any);
  useEffect(() => setBody(record.body as any), [record.slug]);

  const mutation = useMutation({
    mutationFn: (b: Record<string, unknown>) => saveAdminSiteContent(slug, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "content"] });
      toast.success(`${slug} saved`);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  return (
    <div>
      <AdminPageHeader
        title="Page Content"
        description="Edit public page copy. Use JSON or simple key-value for sections."
        actions={
          <div className="flex gap-2">
            <select
              className="h-9 rounded-md border border-hairline bg-background px-2 text-sm"
              value={slug}
              onChange={(e) => setSlug(e.target.value as any)}
            >
              {SITE_CONTENT_SLUGS.filter((s) => s !== "settings").map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={() => nav({ to: "/admin/content/settings" })}>Settings</Button>
            <Button size="sm" onClick={() => mutation.mutate(body)}>Save</Button>
          </div>
        }
      />
      <div className="mt-6 rounded-xl border border-hairline bg-surface p-5">
        <textarea
          className="h-[480px] w-full rounded-md border border-hairline bg-background p-3 font-mono text-xs"
          value={JSON.stringify(body, null, 2)}
          onChange={(e) => {
            try {
              setBody(JSON.parse(e.target.value || "{}"));
            } catch {
              toast.error("Invalid JSON");
            }
          }}
        />
        <p className="mt-2 text-xs text-ink-muted">Edit JSON directly for now — schema-driven forms can be added next.</p>
      </div>
    </div>
  );
}
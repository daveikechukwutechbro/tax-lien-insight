import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getAdminSiteContent, saveAdminSiteContent, type SiteContent } from "@/lib/backend";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/content/settings")({
  component: SettingsEditor,
});

function SettingsEditor() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "content", "all"],
    queryFn: getAdminSiteContent,
  });
  const content = data?.find((c: SiteContent) => c.slug === "settings") ?? { slug: "settings", body: {}, updatedAt: null };
  const [body, setBody] = useState<Record<string, unknown>>(content.body as any);
  if (!isLoading && body === content.body && Object.keys(body).length === 0) {
    // hydrate
  }

  const mutation = useMutation({
    mutationFn: (b: Record<string, unknown>) => saveAdminSiteContent("settings", b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "content"] });
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  return (
    <div>
      <AdminPageHeader
        title="Site Settings"
        description="Control global copy like site name, tagline, contact email, announcement bar and footer text."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => nav({ to: "/admin/content/pages" })}>Manage pages</Button>
            <Button size="sm" onClick={() => mutation.mutate(body)}>Save settings</Button>
          </div>
        }
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {Object.entries(defaultSettings).map(([key, meta]) => (
          <label key={key} className="block text-sm">
            <span className="text-ink-muted">{meta.label}</span>
            <input
              className="mt-1 h-9 w-full rounded-md border border-hairline bg-background px-3 text-sm"
              value={String((body as any)[key] ?? meta.default ?? "")}
              onChange={(e) => setBody({ ...body, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

const defaultSettings: Record<string, { label: string; default?: string }> = {
  siteName: { label: "Site name" },
  tagline: { label: "Tagline" },
  contactEmail: { label: "Contact email" },
  announcementText: { label: "Announcement bar text" },
  footerText: { label: "Footer text" },
  twitterUrl: { label: "Twitter URL" },
  facebookUrl: { label: "Facebook URL" },
  linkedinUrl: { label: "LinkedIn URL" },
};
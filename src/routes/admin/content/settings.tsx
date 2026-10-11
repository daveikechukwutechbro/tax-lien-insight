import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminSiteContent } from "@/lib/backend";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { PageForm } from "@/routes/admin/content/pages";

export const Route = createFileRoute("/admin/content/settings")({
  component: SettingsEditor,
});

function SettingsEditor() {
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "content", "all"],
    queryFn: getAdminSiteContent,
  });
  const saved =
    (data?.find((c) => c.slug === "settings")?.body as Record<string, unknown> | undefined) ??
    undefined;

  return (
    <div>
      <AdminPageHeader
        title="Site Settings"
        description="Global branding, contact details, and the announcement banner shown across the public site."
        actions={
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/admin/content/pages" })}>
            Manage pages
          </Button>
        }
      />
      <div className="mt-6 max-w-3xl">
        {isLoading || !data ? (
          <div className="rounded-xl border border-hairline bg-surface p-10 text-sm text-ink-muted">
            Loading settings…
          </div>
        ) : (
          <PageForm key="settings" slug="settings" saved={saved} />
        )}
      </div>
    </div>
  );
}

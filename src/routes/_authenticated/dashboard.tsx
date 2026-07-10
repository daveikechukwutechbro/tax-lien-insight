import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — TaxLien Auctions" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="bg-background pb-16">
      <div className="container-tight pt-6">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <DashboardSidebar />
          <div className="min-w-0"><Outlet /></div>
        </div>
      </div>
    </div>
  );
}
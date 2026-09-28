import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetOverlay,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — Auction Ledger" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.href]);

  return (
    <div className="bg-background pb-16">
      <div className="container-tight pt-6">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-6">
          <div className="hidden lg:block">
            <DashboardSidebar />
          </div>
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open dashboard menu"
                    className="grid size-10 place-items-center rounded-md border border-hairline bg-surface text-ink hover:bg-surface-alt"
                  >
                    <Menu className="size-5" strokeWidth={1.75} />
                  </button>
                </SheetTrigger>
                <SheetOverlay />
                <SheetContent side="left" className="w-[260px] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <div className="h-[calc(100vh-4rem)] overflow-y-auto py-4">
                    <DashboardSidebar />
                  </div>
                </SheetContent>
              </Sheet>
              <span className="font-display text-lg font-600 text-navy">Dashboard</span>
            </div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
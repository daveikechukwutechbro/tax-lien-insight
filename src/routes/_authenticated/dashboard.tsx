import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileBottomNav } from "@/components/dashboard/bottom-nav";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import {
  Sheet,
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

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/bids": "My Bids",
  "/dashboard/won": "Won Properties",
  "/dashboard/lost": "Lost Properties",
  "/dashboard/watched": "Watched Properties",
  "/dashboard/scheduled": "Scheduled Auctions",
  "/dashboard/history": "Purchase History",
  "/dashboard/payments": "Payments & Invoices",
  "/dashboard/funds": "Add Funds",
  "/dashboard/profile": "Profile Settings",
  "/dashboard/verify": "Identity Verification",
  "/dashboard/notifications": "Notifications",
  "/dashboard/activity": "Recent Activity",
  "/dashboard/searches": "Saved Searches",
  "/dashboard/documents": "Documents",
  "/dashboard/messages": "Messages",
};

function pageLabel(pathname: string) {
  const entry = Object.entries(PAGE_LABELS).find(([key]) => pathname === key || pathname.startsWith(key + "/"));
  return entry?.[1] ?? "Dashboard";
}

function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.href]);
  const label = pageLabel(location.pathname);
  const isRoot = location.pathname === "/dashboard";

  return (
    <div className="bg-background pb-24 lg:pb-16">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetOverlay />
        <SheetContent side="left" className="w-[260px] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="h-[calc(100vh-4rem)] overflow-y-auto py-4">
            <DashboardSidebar />
          </div>
        </SheetContent>
      </Sheet>

      <div className="container-tight pt-4 lg:pt-6">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-6">
          <div className="hidden lg:block">
            <DashboardSidebar />
          </div>
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-1 lg:hidden">
              {!isRoot && (
                <Link
                  to="/dashboard"
                  aria-label="Back to Dashboard"
                  className="-ml-2 grid size-11 place-items-center rounded-full text-ink hover:bg-surface-alt"
                >
                  <ChevronLeft className="size-5" />
                </Link>
              )}
              <h1 className="font-display text-lg font-600 text-navy">{label}</h1>
            </div>
            <Outlet />
          </div>
        </div>
      </div>

      <MobileBottomNav onMore={() => setMenuOpen(true)} moreOpen={menuOpen} />
    </div>
  );
}
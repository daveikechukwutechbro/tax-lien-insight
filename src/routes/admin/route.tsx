import { createFileRoute, Outlet, Link, redirect, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMe, logout, emitAuthChange } from "@/lib/backend-auth";
import { ADMIN_SITE } from "@/lib/site-mode";
import { AdminNav } from "@/components/admin/admin-sidebar";
import { Sheet, SheetContent, SheetOverlay } from "@/components/ui/sheet";
import { Landmark, PanelLeft, ExternalLink, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getMe();
    if (!user) throw redirect({ to: "/auth" });
    const isAdmin = user.roles.includes("admin") || user.roles.includes("super_admin");
    if (!isAdmin) throw redirect({ to: ADMIN_SITE ? "/auth" : "/dashboard" });
    return { user };
  },
  component: AdminShell,
});

const LIVE_SITE_URL = "https://tax-lien-insight-zeta.vercel.app";

function AdminShell() {
  const router = useRouter();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries().catch(() => {});
    qc.clear();
    const pendingLogout = logout();
    if (router.state.location.pathname !== "/") {
      await router.navigate({ to: "/", replace: true });
    }
    emitAuthChange();
    await pendingLogout.catch(() => {});
    router.invalidate().catch(() => {});
  }

  async function handleNavigate() {
    await router.invalidate().catch(() => {});
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-hairline bg-surface lg:flex">
        <Link to="/admin" className="flex h-14 items-center gap-2.5 border-b border-hairline px-5">
          <span className="grid size-8 place-items-center rounded-md bg-navy text-gold">
            <Landmark className="size-4" strokeWidth={2.25} />
          </span>
          <span className="font-display text-[14px] font-700 tracking-tight text-navy">
            Auction<span className="text-gold">Ledger</span>
            <span className="mt-0.5 block text-[9px] font-600 uppercase tracking-widest text-ink-muted">
              Admin Console
            </span>
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>
        <div className="border-t border-hairline p-3">
          <a
            href={LIVE_SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-500 text-ink transition-colors hover:bg-surface-alt hover:text-navy"
          >
            <ExternalLink className="size-4" /> View live site
          </a>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-500 text-ink transition-colors hover:bg-surface-alt hover:text-navy"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetOverlay />
        <SheetContent side="left" className="w-[260px] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="flex h-14 items-center gap-2.5 border-b border-hairline px-5">
            <span className="grid size-8 place-items-center rounded-md bg-navy text-gold">
              <Landmark className="size-4" strokeWidth={2.25} />
            </span>
            <span className="font-display text-[14px] font-700 tracking-tight text-navy">
              Auction<span className="text-gold">Ledger</span> Admin
            </span>
          </div>
          <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
            <AdminNav onNavigate={handleNavigate} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-hairline bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:pl-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(true)}
            className="grid size-9 place-items-center rounded-md text-ink hover:bg-surface-alt lg:hidden"
            aria-label="Open admin menu"
          >
            <PanelLeft className="size-5" />
          </button>
          <p className="hidden text-sm text-ink-muted sm:block">
            Admin Console <span className="mx-1.5 text-hairline">/</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={LIVE_SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-[13px] font-500 text-ink transition-colors hover:border-navy/40 hover:bg-surface-alt sm:inline-flex"
          >
            <ExternalLink className="size-4" /> Live site
          </a>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 py-1.5 text-[13px] font-500 text-ink transition-colors hover:border-navy/40 hover:bg-surface-alt"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="lg:pl-[236px]">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
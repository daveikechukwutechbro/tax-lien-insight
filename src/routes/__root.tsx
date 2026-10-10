import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MobileBottomNav } from "@/components/dashboard/bottom-nav";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Sheet, SheetContent, SheetOverlay } from "@/components/ui/sheet";
import { Toaster } from "sonner";
import { onAuthChange, logout, emitAuthChange } from "@/lib/backend-auth";
import { useSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { Landmark, LogOut } from "lucide-react";
import { ADMIN_SITE } from "@/lib/site-mode";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }: any) => {
    if (ADMIN_SITE) {
      const allowed = ["/admin", "/auth", "/verify", "/reset"];
      const isAllowed = allowed.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));
      if (!isAllowed) {
        throw redirect({ to: "/admin", replace: true });
      }
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Auction Ledger — Tax Lien Certificates & Auction Marketplace" },
      { name: "description", content: "Browse upcoming multi-state tax lien auctions, review property and lien data, and place bids on secured tax lien certificates." },
      { name: "author", content: "Auction Ledger" },
      { property: "og:site_name", content: "Auction Ledger" },
      { property: "og:title", content: "Auction Ledger" },
      { property: "og:description", content: "The transparent marketplace for tax lien certificates across the United States." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const themeInitScript = `try{const t=localStorage.getItem("al-theme");const d=t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches);if(d){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}}catch(e){}`;
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AdminShell() {
  const router = useRouter();
  const qc = useQueryClient();

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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="container-tight flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-md bg-navy text-gold">
              <Landmark className="size-5" strokeWidth={2.25} />
            </span>
            <span className="font-display text-[15px] font-700 tracking-tight text-navy">
              Auction<span className="text-gold">Ledger</span>
              <span className="ml-2 rounded bg-navy/5 px-1.5 py-0.5 text-[10px] font-600 uppercase tracking-widest text-navy">
                Admin
              </span>
            </span>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm font-500 text-ink transition-colors hover:border-navy/40 hover:bg-surface-alt"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster richColors position="top-right" closeButton />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const { user, loading } = useSession();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [location.href]);

  useEffect(() => {
    const sub = onAuthChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => sub();
  }, [router, queryClient]);

  if (ADMIN_SITE) {
    return (
      <QueryClientProvider client={queryClient}>
        <AdminShell />
      </QueryClientProvider>
    );
  }

  const signedIn = !loading && !!user;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteHeader />
        <main className={signedIn ? "flex-1 pb-24 lg:pb-0" : "flex-1"}>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
        <SiteFooter />
        {signedIn && (
          <>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetOverlay />
              <SheetContent side="left" className="w-[260px] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="h-[calc(100vh-4rem)] overflow-y-auto py-4">
                  <DashboardSidebar />
                </div>
              </SheetContent>
            </Sheet>
            <MobileBottomNav onMore={() => setMenuOpen(true)} moreOpen={menuOpen} />
          </>
        )}
        <Toaster richColors position="top-right" closeButton />
      </div>
    </QueryClientProvider>
  );
}

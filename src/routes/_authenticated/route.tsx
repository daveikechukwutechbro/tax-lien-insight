import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMe, knownAuthenticated } from "@/lib/backend-auth";
import { PageSkeleton } from "@/components/site/page-skeleton";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingMs: 0,
  pendingComponent: () => <PageSkeleton rows={2} />,
  beforeLoad: async () => {
    if (knownAuthenticated) return {};
    // Retry once on a transient Worker/timeout blip so a slow backend never
    // bounces a signed-in user to /auth (or shows the error page).
    let user: Awaited<ReturnType<typeof getMe>> | null = null;
    for (let i = 0; i < 2 && !user; i++) {
      try {
        user = await getMe();
      } catch {
        // transient — retry, then redirect if it never settles
      }
    }
    if (!user) throw redirect({ to: "/", replace: true });
    return {};
  },
  component: () => <Outlet />,
});
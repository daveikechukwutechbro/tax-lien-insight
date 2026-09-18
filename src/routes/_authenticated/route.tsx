import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMe, knownAuthenticated } from "@/lib/backend-auth";
import { PageSkeleton } from "@/components/site/page-skeleton";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingMs: 0,
  pendingComponent: () => <PageSkeleton rows={2} />,
  beforeLoad: async () => {
    if (knownAuthenticated) return {};
    const user = await getMe();
    if (!user) throw redirect({ to: "/auth" });
    return {};
  },
  component: () => <Outlet />,
});
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteFrame } from "@/components/site/route-frame";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 2,
        retryDelay: 500,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,

    // === Resilience ===
    // Never let a route-level error produce a blank screen or the generic
    // "This page didn't load" frame. Every route inherits a friendly
    // error/not-found frame, and data pages render skeletons from useQuery
    // loading states (no component suspense, so nothing can go blank).
    defaultPendingMs: 0,
    defaultErrorComponent: RouteFrame.Error,
    defaultNotFoundComponent: RouteFrame.NotFound,
  });

  return router;
};
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RoutePendingComponent, RouteErrorComponent } from "./components/route-fallbacks";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    defaultPendingComponent: RoutePendingComponent,
    defaultPendingMs: 180,
    defaultPendingMinMs: 250,
    defaultErrorComponent: RouteErrorComponent,
  });

  return router;
};

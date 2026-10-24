import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { QueryClient } from "@tanstack/react-query"
import { routeTree } from "./routeTree.gen"

export function createRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5 // 5 minutes cache
      }
    }
  })

  return createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true
  })
}

export const getRouter = createRouter

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}

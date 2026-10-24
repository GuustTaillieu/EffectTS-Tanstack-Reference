import { QueryClient, focusManager } from "@tanstack/react-query"
import { AppState, type AppStateStatus, Platform } from "react-native"

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active")
  }
}

// Automatically refetch queries when mobile app comes back to the foreground
AppState.addEventListener("change", onAppStateChange)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2
    }
  }
})

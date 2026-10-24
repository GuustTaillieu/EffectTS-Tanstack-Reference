import { Stack } from "expo-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { StatusBar } from "expo-status-bar"
import { queryClient } from "../lib/queryClient"

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#09090b"
          },
          headerTintColor: "#fafafa",
          headerTitleStyle: {
            fontWeight: "bold"
          },
          contentStyle: {
            backgroundColor: "#09090b"
          }
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Join Music Quiz"
          }}
        />
        <Stack.Screen
          name="game"
          options={{
            title: "Quiz Controller",
            headerBackVisible: false
          }}
        />
      </Stack>
    </QueryClientProvider>
  )
}

/** Root layout — providers + stack (tabs are the main app shell). */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors } from "@/constants/theme";
import { AuthProvider } from "@/providers/AuthProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: "Join Gist", presentation: "modal" }} />
        {/* Chat MVP screens */}
        <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="new-chat" options={{ title: "New chat" }} />
        {/* Legacy gist routes — kept routable but outside chat navigation */}
        <Stack.Screen name="post/[id]" options={{ title: "Gist" }} />
        <Stack.Screen
          name="share/[id]"
          options={{ title: "Someone shared a gist 🔥" }}
        />
      </Stack>
    </AuthProvider>
  );
}

/**
 * Bottom tab bar — Chats (home), Profile. Pipe-vector icons throughout.
 * The chat MVP is chat-only: the old Feed/Compose tabs stay in the
 * codebase but are no longer part of navigation.
 */

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/constants/theme";

function TabIcon({
  icon,
  focused,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  return (
    <Ionicons
      name={icon}
      size={24}
      color={focused ? colors.primary : colors.textFaint}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "800", fontSize: 20 },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: 30,
        },
        tabBarLabelStyle: { fontWeight: "800" },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarLabel: "Chats",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "chatbubbles" : "chatbubbles-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Me",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "person-circle" : "person-circle-outline"} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

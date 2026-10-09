import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { RoleProtectedLayout } from "../../src/components/RoleProtectedLayout";

export default function DeliveryLayout() {
  return (
    <RoleProtectedLayout allowedRole="delivery">
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#932D2C",
        tabBarInactiveTintColor: "#9A9A9A",
        tabBarStyle: { backgroundColor: "#FFFFFF", borderTopColor: "#EDEDED", height: 62, paddingTop: 6, paddingBottom: 7 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="tasks"
        options={{
          title: "My Deliveries",
          tabBarIcon: ({ color, size }) => <Ionicons name="bicycle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
    </RoleProtectedLayout>
  );
}

// app/(customer)/_layout.tsx
import { Ionicons } from "@expo/vector-icons"; // Built into Expo
import { Tabs } from "expo-router";
import { CartProvider } from "../../src/context/CartContext"; // <-- Import the provider
import { RoleProtectedLayout } from "../../src/components/RoleProtectedLayout";

export default function CustomerLayout() {
  return (
    <RoleProtectedLayout allowedRole="customer">
      <CartProvider>
      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: false, // We will build custom headers in the screens
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopColor: "#EDEDED",
            borderTopWidth: 1,
            elevation: 0,
            shadowOpacity: 0,
            height: 64,
            paddingBottom: 8,
            paddingTop: 5,
          },
          tabBarActiveTintColor: "#932D2C",
          tabBarInactiveTintColor: "#9A9A9A",
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: "Shop",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: "Cart",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="product/[id]" options={{ href: null }} />
        <Tabs.Screen name="checkout" options={{ href: null }} />
        <Tabs.Screen name="purchases" options={{ href: null }} />
      </Tabs>
      </CartProvider>
    </RoleProtectedLayout>
  );
}

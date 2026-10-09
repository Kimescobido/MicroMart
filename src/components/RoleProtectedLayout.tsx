import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../services/authService";

const homeForRole = (role: UserRole) => {
  if (role === "admin") return "/(admin)/dashboard" as const;
  if (role === "delivery") return "/(delivery)/tasks" as const;
  return "/(customer)/home" as const;
};

export function RoleProtectedLayout({
  allowedRole,
  children,
}: {
  allowedRole: UserRole;
  children: ReactNode;
}) {
  const { user, role, isLoading, profileError } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#932D2C" />
        <Text style={styles.loadingText}>Checking your account…</Text>
      </View>
    );
  }

  if (!user || !role) {
    if (profileError) console.warn(profileError);
    return <Redirect href="/(auth)" />;
  }

  if (role !== allowedRole) return <Redirect href={homeForRole(role)} />;

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#FFFBF7" },
  loadingText: { color: "#514B45", fontSize: 13 },
});

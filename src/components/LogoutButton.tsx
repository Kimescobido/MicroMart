import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity } from "react-native";
import { logoutUser } from "../services/authService";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const confirmLogout = () => Alert.alert("Log out", "Are you sure you want to log out?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Log out",
      style: "destructive",
      onPress: () => { void performLogout(); },
    },
  ]);

  const performLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
      router.replace("/(auth)");
    } catch (error) {
      console.error("Could not sign out", error);
      Alert.alert("Couldn't log out", "Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, compact && styles.compactButton]}
      onPress={confirmLogout}
      disabled={isLoggingOut}
      accessibilityRole="button"
      accessibilityLabel="Log out"
    >
      {isLoggingOut ? <ActivityIndicator size="small" color="#932D2C" /> : <Ionicons name="log-out-outline" size={18} color="#932D2C" />}
      {!compact ? <Text style={styles.label}>Log out</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 14, borderWidth: 1, borderColor: "#E9D6D4", backgroundColor: "#FFFFFF", paddingHorizontal: 18 },
  compactButton: { width: 38, height: 38, minHeight: 38, paddingHorizontal: 0, borderRadius: 13 },
  label: { color: "#932D2C", fontSize: 14, fontWeight: "700" },
});

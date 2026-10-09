import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogoutButton } from "../../src/components/LogoutButton";
import { useAuth } from "../../src/context/AuthContext";

export default function AdminProfileScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <View style={styles.avatar}><Ionicons name="person-outline" size={30} color="#932D2C" /></View>
        <Text style={styles.title}>Admin profile</Text>
        <Text style={styles.subtitle}>Signed in to MicroMart as an administrator</Text>
        <View style={styles.accountCard}>
          <Text style={styles.label}>Account email</Text>
          <Text style={styles.email}>{user?.email || "No email available"}</Text>
          <View style={styles.roleBadge}><Text style={styles.roleText}>ADMIN</Text></View>
        </View>
        <LogoutButton />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFBF7" },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  avatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: "#F9EBEA", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 17 },
  title: { color: "#2C2B27", fontSize: 23, fontWeight: "700", textAlign: "center" },
  subtitle: { color: "#77736D", fontSize: 13, textAlign: "center", marginTop: 7, marginBottom: 25 },
  accountCard: { padding: 17, borderRadius: 16, borderWidth: 1, borderColor: "#EEEAE4", backgroundColor: "#FFFFFF", marginBottom: 18 },
  label: { color: "#8F8982", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  email: { color: "#24211D", fontSize: 15, fontWeight: "600", marginTop: 7 },
  roleBadge: { alignSelf: "flex-start", backgroundColor: "#F9EBEA", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, marginTop: 12 },
  roleText: { color: "#932D2C", fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
});

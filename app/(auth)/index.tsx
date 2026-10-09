// app/(auth)/index.tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { loginUser, registerUser } from "../../src/services/authService";

type AuthMode = "login" | "register";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (mode === "register" && !fullName)) {
      return Alert.alert("Error", "Please fill in all required fields.");
    }

    setLoading(true);
    try {
      if (mode === "login") {
        // Capture the returned profile which contains the role
        const { userProfile } = await loginUser(email, password);

        // Route based on the user's role
        if (userProfile.role === "admin") {
          router.replace("/(admin)/dashboard");
        } else if (userProfile.role === "delivery") {
          router.replace("/(delivery)/tasks");
        } else {
          router.replace("/(customer)/home");
        }
      } else {
        await registerUser(email, password, fullName);
        router.push("/(auth)/success");
      }
    } catch (error: any) {
      console.log("FULL FIREBASE ERROR:", error);
      Alert.alert(
        "Authentication Failed",
        error.message || "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.brandTitle}>MicroMart</Text>

      {/* Toggle Tabs */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, mode === "login" && styles.activeToggle]}
          onPress={() => setMode("login")}
        >
          <Text
            style={[
              styles.toggleText,
              mode === "login" && styles.activeToggleText,
            ]}
          >
            Login
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            mode === "register" && styles.activeToggle,
          ]}
          onPress={() => setMode("register")}
        >
          <Text
            style={[
              styles.toggleText,
              mode === "register" && styles.activeToggleText,
            ]}
          >
            Register
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View style={styles.formContainer}>
        {mode === "register" && (
          <>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kim Escobido"
              placeholderTextColor="#888"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </>
        )}

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.submitButtonText}>
              {mode === "login" ? "Login" : "Register"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4ED",
    paddingHorizontal: 30,
    justifyContent: "center",
  },
  brandTitle: {
    fontFamily: "serif",
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#000",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
    backgroundColor: "#E6E8DE",
    borderRadius: 25,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 22,
  },
  activeToggle: {
    backgroundColor: "#F9EBAE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    color: "#47481F",
    fontWeight: "500",
  },
  activeToggleText: {
    fontWeight: "bold",
    color: "#000",
  },
  formContainer: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    color: "#47481F",
    marginBottom: 6,
    marginLeft: 4,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D2C5",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#000",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#F9EBAE",
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
});

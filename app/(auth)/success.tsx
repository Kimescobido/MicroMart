// app/(auth)/success.tsx
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SuccessScreen() {
  const router = useRouter();

  const handleContinue = () => {
    // Routes the user out of the auth group and into their catalog
    router.replace("/(customer)/home");
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../images/success.png")}
        style={styles.image}
        resizeMode="contain"
      />

      <Text style={styles.title}>Welcome to MicroMart</Text>
      <Text style={styles.subtitle}>
        Your account has been successfully created.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4ED",
    padding: 30,
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
    fontFamily: "serif",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#47481F",
    marginBottom: 40,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#F9EBAE",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
});

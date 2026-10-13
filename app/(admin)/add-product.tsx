// app/(admin)/add-product.tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addProduct, getProductById, updateProduct } from "../../src/services/productService";

export default function AddProductScreen() {
  const router = useRouter();
  const { productId: rawProductId } = useLocalSearchParams<{ productId?: string }>();
  const productId = typeof rawProductId === "string" ? rawProductId : undefined;
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(Boolean(productId));

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newCategory, setNewCategory] = useState("Microcontroller");
  const [newVoltage, setNewVoltage] = useState("3.3V");
  const [compatibleBoards, setCompatibleBoards] = useState("");
  const [interfaces, setInterfaces] = useState("");
  const [currentRequirement, setCurrentRequirement] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const parseTags = (value: string) => Array.from(new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean)));

  useEffect(() => {
    if (!productId) return;
    let active = true;
    getProductById(productId).then((product) => {
      if (!active) return;
      if (!product) {
        Alert.alert("Product not found", "It may have been deleted from inventory.", [{ text: "Go back", onPress: () => router.back() }]);
        return;
      }
      setNewName(product.name);
      setNewPrice(String(product.price));
      setNewStock(String(product.stock));
      setNewCategory(product.category);
      setNewVoltage(product.voltage);
      setCompatibleBoards(product.compatibleBoards?.join(", ") ?? "");
      setInterfaces(product.interfaces?.join(", ") ?? "");
      setCurrentRequirement(product.currentRequirement ?? "");
      setSpecifications(product.specifications ?? "");
      setImageUri(product.imageUrl || null);
    }).catch(() => {
      if (active) Alert.alert("Couldn't load product", "Check your connection and try again.");
    }).finally(() => {
      if (active) setIsLoadingProduct(false);
    });
    return () => { active = false; };
  }, [productId, router]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSaveProduct = async () => {
    const price = Number(newPrice);
    const stock = Number(newStock);
    if (!newName.trim() || !newPrice.trim() || !newStock.trim()) {
      return Alert.alert(
        "Missing Fields",
        "Please fill out the name, price, and stock.",
      );
    }
    if (!Number.isFinite(price) || price <= 0) {
      return Alert.alert("Check the price", "Enter a price greater than zero.");
    }
    if (!Number.isInteger(stock) || stock < 0) {
      return Alert.alert("Check the stock", "Enter a whole number of zero or more.");
    }

    setIsLoading(true);
    try {
      const productData = {
        name: newName.trim(),
        price,
        stock,
        category: newCategory,
        voltage: newVoltage,
        compatibleBoards: parseTags(compatibleBoards),
        interfaces: parseTags(interfaces),
        currentRequirement: currentRequirement.trim(),
        specifications: specifications.trim(),
      };
      if (productId) await updateProduct(productId, productData, imageUri);
      else await addProduct(productData, imageUri);

      Alert.alert("Saved", productId ? "Product details updated." : "Product added to inventory.");
      router.back(); // Automatically go back to the inventory list
    } catch {
      Alert.alert("Error", "Failed to save the product to the database.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#2C2B27" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{productId ? "Edit Product" : "Add Product"}</Text>
        <View style={{ width: 24 }} /> {/* Spacer to center title */}
      </View>

      {isLoadingProduct ? (
        <ActivityIndicator size="large" color="#903A30" style={{ marginTop: 40 }} />
      ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.inputLabel}>Product Image</Text>
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color="#A09F9B" />
              <Text style={styles.imagePickerText}>Tap to upload photo</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.inputLabel}>Product Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., ESP32 WROOM"
          value={newName}
          onChangeText={setNewName}
        />

        <View style={styles.rowInputs}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.inputLabel}>Price (₱)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={newPrice}
              onChangeText={setNewPrice}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Initial Stock</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="numeric"
              value={newStock}
              onChangeText={setNewStock}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Category</Text>
        <View style={styles.chipRow}>
          {[...new Set(["Microcontroller", "Sensor", "Display", "Power", newCategory])].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, newCategory === cat && styles.activeChip]}
              onPress={() => setNewCategory(cat)}
            >
              <Text
                style={[
                  styles.chipText,
                  newCategory === cat && styles.activeChipText,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Compatible boards (comma-separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="ESP32, Arduino Uno, Raspberry Pi Pico"
          value={compatibleBoards}
          onChangeText={setCompatibleBoards}
          autoCapitalize="words"
        />

        <Text style={styles.inputLabel}>Interface / protocol (comma-separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="I2C, SPI, UART, GPIO"
          value={interfaces}
          onChangeText={setInterfaces}
          autoCapitalize="characters"
        />

        <Text style={styles.inputLabel}>Current requirement</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 20 mA typical, 100 mA maximum"
          value={currentRequirement}
          onChangeText={setCurrentRequirement}
        />

        <Text style={styles.inputLabel}>Technical specifications</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Pin count, operating range, dimensions, or other useful specs"
          value={specifications}
          onChangeText={setSpecifications}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.inputLabel}>Logic/Operating Voltage</Text>
        <View style={styles.chipRow}>
          {["3.3V", "5V", "12V", "Any"].map((volt) => (
            <TouchableOpacity
              key={volt}
              style={[styles.chip, newVoltage === volt && styles.activeChip]}
              onPress={() => setNewVoltage(volt)}
            >
              <Text
                style={[
                  styles.chipText,
                  newVoltage === volt && styles.activeChipText,
                ]}
              >
                {volt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveProduct}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>{productId ? "Save Changes" : "Save to Inventory"}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFBF7" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C2B27",
  },
  backButton: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  imagePickerButton: {
    height: 120,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAE6DF",
    borderStyle: "dashed",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  imagePickerText: { color: "#A09F9B", marginTop: 8, fontWeight: "500" },
  previewImage: { width: "100%", height: "100%" },

  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A4A4A",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAE6DF",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#2C2B27",
    marginBottom: 8,
  },
  multilineInput: { minHeight: 90, paddingTop: 12 },
  rowInputs: { flexDirection: "row", justifyContent: "space-between" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  chip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAE6DF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeChip: { backgroundColor: "#2C2B27", borderColor: "#2C2B27" },
  chipText: { color: "#A09F9B", fontWeight: "500" },
  activeChipText: { color: "#FFF" },

  saveButton: {
    backgroundColor: "#903A30",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 32,
    marginBottom: 20,
  },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});

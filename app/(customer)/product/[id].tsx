// app/(customer)/product/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../../../src/context/CartContext"; // <-- Import the cart hook
import { getProductById, Product } from "../../../src/services/productService";

const { width, height } = Dimensions.get("window");
const PRIMARY = "#932D2C";

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // <-- Grab the addToCart function from our context
  const { addToCart, cartItemCount } = useCart();

  useEffect(() => {
    const loadProduct = async () => {
      if (typeof id === "string") {
        const data = await getProductById(id);
        setProduct(data);
      }
      setIsLoading(false);
    };
    loadProduct();
  }, [id]);

  // <-- New function to handle the button press
  const handleAddToCart = () => {
    if (product) {
      addToCart(product);
      Alert.alert(
        "Added to Cart",
        `${product.name} has been added to your cart!`,
        [
          { text: "Keep Shopping", style: "cancel" },
          {
            text: "Go to Cart",
            onPress: () => router.push("/(customer)/cart"),
          },
        ],
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#932D2C" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Component not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Image Section */}
      <View style={styles.imageSection}>
        <SafeAreaView edges={["top"]} style={styles.header}>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#24211D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>COMPONENT DETAILS</Text>
          <TouchableOpacity style={styles.iconCircle}>
            <Ionicons name="cart-outline" size={21} color="#24211D" />
            {cartItemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemCount > 99 ? "99+" : cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.imageContainer}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.productImage}
            />
          ) : (
            <Ionicons
              name="hardware-chip-outline"
              size={120}
              color="#24211D"
              style={{ opacity: 0.1 }}
            />
          )}
        </View>
      </View>

      {/* Bottom Content Card */}
      <View style={styles.contentCard}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <TouchableOpacity>
              <Ionicons name="share-social-outline" size={24} color="#A09F9B" />
            </TouchableOpacity>
          </View>

          <View style={styles.categoryRow}>
            <View style={styles.categoryPill}><Text style={styles.categoryText}>{product.category}</Text></View>
            <View style={styles.soldMeta}>
              <Ionicons name="trending-up" size={14} color={PRIMARY} />
              <Text style={styles.soldText}>{product.soldCount ?? 0} sold</Text>
            </View>
            <Text style={styles.stockMeta}>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</Text>
          </View>

          <Text style={styles.priceHeadline}>₱{product.price.toFixed(2)}</Text>

          <Text style={styles.sectionTitle}>DESCRIPTION</Text>
          <Text style={styles.descriptionText}>
            A high-quality {product.category.toLowerCase()} perfect for your
            next maker project. Ensure your microcontroller logic matches the
            required operating voltage for safe operation.{" "}
            <Text style={styles.readMore}>Read More</Text>
          </Text>

          <Text style={styles.sectionTitle}>OPERATING VOLTAGE</Text>
          <View style={styles.voltageRow}>
            {["3.3V", "5V", "12V", "Any"].map((volt) => {
              const isSelected = product.voltage === volt;
              return (
                <View
                  key={volt}
                  style={[
                    styles.voltagePill,
                    isSelected && styles.voltagePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.voltageText,
                      isSelected && styles.voltageTextActive,
                    ]}
                  >
                    {volt}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.compatibilityBox}>
            <Ionicons name="flash-outline" size={20} color="#932D2C" />
            <Text style={styles.compatibilityText}>
              Listed operating voltage: {product.voltage}. Confirm your board&apos;s logic level before connecting; use a level shifter when signal levels differ.
            </Text>
          </View>

          {(product.compatibleBoards?.length || product.interfaces?.length || product.currentRequirement || product.specifications) ? (
            <View style={styles.specificationsCard}>
              <Text style={styles.sectionTitle}>BOARD & INTERFACE DETAILS</Text>
              {product.compatibleBoards?.length ? (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Compatible boards</Text>
                  <Text style={styles.specValue}>{product.compatibleBoards.join(", ")}</Text>
                </View>
              ) : null}
              {product.interfaces?.length ? (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Interface / protocol</Text>
                  <Text style={styles.specValue}>{product.interfaces.join(", ")}</Text>
                </View>
              ) : null}
              {product.currentRequirement ? (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Current requirement</Text>
                  <Text style={styles.specValue}>{product.currentRequirement}</Text>
                </View>
              ) : null}
              {product.specifications ? (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Specifications</Text>
                  <Text style={styles.specValue}>{product.specifications}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Floating Bottom Bar */}
        <View style={styles.bottomBarContainer}>
          <View style={styles.bottomBar}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.priceValue}>{"\u20B1"}{product.price.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={handleAddToCart}
            >
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EDEDED" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  errorText: { fontSize: 16, color: "#24211D", marginBottom: 16 },
  backBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backBtnText: { color: "#FFF", fontWeight: "bold" },

  imageSection: { height: height * 0.46, position: "relative", backgroundColor: "#EDEDED" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartBadge: { position: "absolute", right: -4, top: -4, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { color: "#FFF", fontSize: 8, fontWeight: "800" },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#24211D",
  },

  imageContainer: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  productImage: { width: "88%", height: "86%", resizeMode: "contain" },

  contentCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  scrollContent: { padding: 20, paddingTop: 24 },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  productName: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#24211D",
    flex: 1,
    marginRight: 16,
    lineHeight: 32,
  },

  categoryRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  byText: { fontSize: 14, color: "#A09F9B" },
  categoryText: { fontSize: 11, fontWeight: "700", color: PRIMARY },
  categoryPill: { backgroundColor: "#FFF1F1", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  soldMeta: { flexDirection: "row", alignItems: "center", gap: 3 },
  soldText: { color: "#77766F", fontSize: 11 },
  stockMeta: { color: "#77766F", fontSize: 10, marginLeft: "auto" },
  priceHeadline: { color: PRIMARY, fontSize: 21, fontWeight: "800", marginBottom: 19 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#24211D",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: "#7A7A7A",
    lineHeight: 22,
    marginBottom: 24,
  },
  readMore: { fontWeight: "bold", color: PRIMARY },

  voltageRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  voltagePill: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#FFFBF7",
    borderWidth: 1,
    borderColor: "#EAE6DF",
  },
  voltagePillActive: { backgroundColor: "#FFF1F1", borderColor: PRIMARY },
  voltageText: { fontSize: 14, color: "#A09F9B", fontWeight: "600" },
  voltageTextActive: { color: PRIMARY },

  compatibilityBox: {
    flexDirection: "row",
    backgroundColor: "#FFF8F8",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F4D4D4",
    alignItems: "center",
  },
  compatibilityText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: "#4A4A4A",
    lineHeight: 18,
  },
  specificationsCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 15, marginTop: 18, borderWidth: 1, borderColor: "#EAE6DF" },
  specRow: { borderTopWidth: 1, borderTopColor: "#F0EDE7", paddingTop: 10, marginTop: 9 },
  specLabel: { color: "#8F8982", fontSize: 10, fontWeight: "700", marginBottom: 4 },
  specValue: { color: "#24211D", fontSize: 13, lineHeight: 19 },

  bottomBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
  },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: "#24211D",
    borderRadius: 32,
    padding: 6,
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceContainer: { paddingLeft: 14, justifyContent: "center", minWidth: 105 },
  priceLabel: { color: "#E6E3DF", fontSize: 10 },
  priceValue: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  addToCartButton: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 26,
    flex: 1,
    alignItems: "center",
  },
  addToCartText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});

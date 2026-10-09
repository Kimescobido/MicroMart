// app/(customer)/cart.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../../src/context/CartContext";

export default function CartScreen() {
  const router = useRouter();
  // Ensure decreaseQuantity is pulled from useCart here:
  const {
    cart,
    addToCart,
    decreaseQuantity,
    removeFromCart,
    cartTotal,
    hasVoltageMismatch,
  } = useCart();

  const handleCheckout = () => {
    if (cart.length === 0) {
      return Alert.alert(
        "Empty Cart",
        "Add some components before checking out.",
      );
    }

    router.push("/(customer)/checkout");
  };

  const renderCartItem = ({ item }: { item: any }) => (
    <View style={styles.cartCard}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="hardware-chip-outline" size={24} color="#24211D" />
        </View>
      )}

      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.tagRow}>
          <View style={styles.miniTag}>
            <Text style={styles.miniTagText}>{item.category}</Text>
          </View>
          <View style={[styles.miniTag, { backgroundColor: "#EAE6DF" }]}>
            <Text style={[styles.miniTagText, { color: "#24211D" }]}>
              {item.voltage}
            </Text>
          </View>
        </View>
        <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
      </View>

      <View style={styles.rightActionContainer}>
        {/* Delete item completely */}
        <TouchableOpacity
          onPress={() => removeFromCart(item.id)}
          style={styles.deleteIconBtn}
        >
          <Ionicons name="trash-outline" size={16} color="#932D2C" />
        </TouchableOpacity>

        <View style={styles.quantityContainer}>
          {/* Decrement or remove quantity */}
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => decreaseQuantity(item.id)}
          >
            <Ionicons name="remove" size={14} color="#24211D" />
          </TouchableOpacity>

          <Text style={styles.qtyText}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => addToCart(item)}
          >
            <Ionicons name="add" size={14} color="#24211D" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <Text style={styles.itemCountText}>{cart.length} items</Text>
      </View>

      {/* COMPATIBILITY ENGINE WARNING BANNER */}
      {hasVoltageMismatch && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={20} color="#932D2C" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.warningTitle}>Voltage Mismatch Detected</Text>
            <Text style={styles.warningDesc}>
              You have both 3.3V and 5V parts in your cart.
            </Text>
          </View>
        </View>
      )}

      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#A09F9B" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Explore the catalog and add components to start your build.
          </Text>
          <TouchableOpacity
            style={styles.shopNowButton}
            onPress={() => router.push("/(customer)/shop")}
          >
            <Text style={styles.shopNowText}>Browse Catalog</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id!}
            renderItem={renderCartItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₱{cartTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBF7" },
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#24211D",
  },
  itemCountText: { fontSize: 14, color: "#A09F9B", fontWeight: "500" },

  warningBanner: {
    flexDirection: "row",
    backgroundColor: "#F9EBEA",
    borderWidth: 1,
    borderColor: "#F5B7B1",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  warningTitle: { fontSize: 13, fontWeight: "bold", color: "#932D2C" },
  warningDesc: { fontSize: 12, color: "#78281F", marginTop: 2 },

  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  cartCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EDEDED",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },

  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: "#FFFBF7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemImage: { width: 50, height: 50, borderRadius: 10, marginRight: 12 },

  itemDetails: { flex: 1 },
  itemName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#24211D",
    marginBottom: 4,
  },
  tagRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  miniTag: {
    backgroundColor: "#24211D",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  miniTagText: { color: "#FFF", fontSize: 9, fontWeight: "600" },
  itemPrice: { fontSize: 14, fontWeight: "bold", color: "#932D2C" },

  rightActionContainer: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: "100%",
  },
  deleteIconBtn: { marginBottom: 8, padding: 2 },

  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBF7",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAE6DF",
  },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAE6DF",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#24211D",
    minWidth: 16,
    textAlign: "center",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "bold",
    color: "#24211D",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#A09F9B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  shopNowButton: {
    backgroundColor: "#932D2C",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  shopNowText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },

  footer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EAE6DF",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: { fontSize: 14, color: "#A09F9B", fontWeight: "500" },
  totalValue: { fontSize: 22, fontWeight: "bold", color: "#24211D" },
  checkoutButton: {
    backgroundColor: "#932D2C",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  checkoutButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});

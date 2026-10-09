// app/(admin)/products.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteProduct, getProducts, Product } from "../../src/services/productService";

type StockFilter = "all" | "low" | "out";

export default function AdminProductsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsFetching(true);
    try {
      const fetchedProducts = await getProducts();
      setProducts(fetchedProducts);
    } catch {
      Alert.alert("Error", "Could not load inventory.");
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Refresh inventory each time the admin returns to this tab.
  useFocusEffect(useCallback(() => { void loadProducts(); }, [loadProducts]));

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
    (stockFilter === "all" || (stockFilter === "low" && product.stock > 0 && product.stock < 10) || (stockFilter === "out" && product.stock <= 0)),
  );

  const confirmDelete = (product: Product) => {
    if (!product.id) return;
    Alert.alert("Delete product?", `${product.name} will be removed from the catalog.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(product.id!);
          try {
            await deleteProduct(product.id!);
            setProducts((current) => current.filter((item) => item.id !== product.id));
          } catch {
            Alert.alert("Couldn't delete product", "Check your connection and try again.");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productInfoLeft}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.productImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="hardware-chip-outline"
                size={32}
                color="#2C2B27"
              />
            </View>
          )}

          <View style={styles.productNameArea}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.tagsRow}>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{item.category}</Text>
              </View>
              <View style={[styles.tagPill, { backgroundColor: "#EAE6DF" }]}>
                <Text style={[styles.tagText, { color: "#2C2B27" }]}>
                  {item.voltage}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.productInfoRight}>
          <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>
          <Text
            style={[styles.stockText, item.stock < 10 && styles.lowStockText]}
          >
            Stock: {item.stock}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push({ pathname: "/(admin)/add-product", params: { productId: item.id ?? "" } })}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
          >
            <Ionicons name="create-outline" size={15} color="#2C2B27" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteButton, deletingId === item.id && styles.disabledButton]}
          onPress={() => confirmDelete(item)}
          disabled={deletingId === item.id}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.name}`}
        >
          {deletingId === item.id ? <ActivityIndicator size="small" color="#D9534F" /> : <Ionicons name="trash-outline" size={15} color="#D9534F" />}
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        {/* Navigates directly to the new screen instead of opening a modal */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/(admin)/add-product")}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#A09F9B"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#A09F9B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.inventoryCount}>{filteredProducts.length} of {products.length} products</Text>
        <Text style={styles.stockSummary}>{products.filter((product) => product.stock > 0 && product.stock < 10).length} low stock</Text>
      </View>
      <View style={styles.filterRow}>
        {([
          { key: "all", label: `All (${products.length})` },
          { key: "low", label: `Low stock (${products.filter((product) => product.stock > 0 && product.stock < 10).length})` },
          { key: "out", label: `Out (${products.filter((product) => product.stock <= 0).length})` },
        ] as { key: StockFilter; label: string }[]).map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[styles.filterChip, stockFilter === filter.key && styles.filterChipSelected]}
            onPress={() => setStockFilter(filter.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: stockFilter === filter.key }}
          >
            <Text style={[styles.filterChipText, stockFilter === filter.key && styles.filterChipTextSelected]}>{filter.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isFetching ? (
        <ActivityIndicator
          size="large"
          color="#903A30"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id!}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {products.length === 0 ? "Your inventory is empty. Add your first product to get started." : "No products match this search or stock filter."}
            </Text>
          }
        />
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C2B27",
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#903A30",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    gap: 6,
  },
  addButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#EAE6DF",
    marginBottom: 20,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: "#2C2B27" },
  summaryRow: { marginHorizontal: 20, flexDirection: "row", justifyContent: "space-between", marginTop: -8, marginBottom: 12 },
  inventoryCount: { color: "#514B45", fontSize: 12, fontWeight: "700" },
  stockSummary: { color: "#B36C1E", fontSize: 12, fontWeight: "600" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EAE6DF" },
  filterChipSelected: { backgroundColor: "#2C2B27", borderColor: "#2C2B27" },
  filterChipText: { color: "#716A62", fontSize: 11, fontWeight: "600" },
  filterChipTextSelected: { color: "#FFFFFF" },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyText: {
    textAlign: "center",
    color: "#A09F9B",
    marginTop: 40,
    paddingHorizontal: 20,
  },

  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0EFEA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  productInfoLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  productNameArea: { flex: 1, flexShrink: 1 },
  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#FDFBF7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productImage: { width: 50, height: 50, borderRadius: 12, marginRight: 12 },

  productName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2C2B27",
    marginBottom: 6,
  },
  tagsRow: { flexDirection: "row", gap: 8 },
  tagPill: {
    backgroundColor: "#2C2B27",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tagText: { color: "#FFF", fontSize: 10, fontWeight: "600" },

  productInfoRight: { alignItems: "flex-end" },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#903A30",
    marginBottom: 4,
  },
  stockText: { fontSize: 12, color: "#A09F9B", fontWeight: "500" },
  lowStockText: { color: "#D9534F", fontWeight: "bold" },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0EFEA",
    paddingTop: 16,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#EAE6DF",
  },
  editButtonText: { color: "#2C2B27", fontWeight: "600", fontSize: 14 },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9534F",
  },
  deleteButtonText: { color: "#D9534F", fontWeight: "600", fontSize: 14 },
  disabledButton: { opacity: 0.6 },
});

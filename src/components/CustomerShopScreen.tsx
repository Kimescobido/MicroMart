import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { getProducts, Product } from "../services/productService";

const ACCENT = "#932D2C";
const INK = "#24211D";
const MUTED = "#77766F";

const categoryIcon = (category: string) => {
  const value = category.toLowerCase();
  if (value.includes("sensor")) return "wifi-outline";
  if (value.includes("display")) return "tablet-portrait-outline";
  if (value.includes("power")) return "battery-charging-outline";
  if (value.includes("micro") || value.includes("board"))
    return "hardware-chip-outline";
  return "grid-outline";
};

export default function CustomerShopScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { cartItemCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedVoltage, setSelectedVoltage] = useState("All");
  const [selectedBoard, setSelectedBoard] = useState("All");
  const [sortMode, setSortMode] = useState<"Popular" | "Latest" | "Best Sellers" | "Price">("Popular");
  const [priceDescending, setPriceDescending] = useState(false);
  const cardWidth = (width - 48) / 2;

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchInventory = async () => {
        setIsLoading(true);
        try {
          const liveData = await getProducts();
          if (isActive) setProducts(liveData);
        } catch (error) {
          console.error("Failed to fetch products:", error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      fetchInventory();
      return () => {
        isActive = false;
      };
    }, []),
  );

  const sourceProducts = products;

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(sourceProducts.map((product) => product.category).filter(Boolean)),
      ),
    ],
    [sourceProducts],
  );

  const voltageOptions = useMemo(() => [
    "All",
    ...Array.from(new Set(sourceProducts.map((product) => product.voltage?.trim()).filter((voltage): voltage is string => Boolean(voltage)))),
  ], [sourceProducts]);
  const boardOptions = useMemo(() => [
    "All",
    ...Array.from(new Set(sourceProducts.flatMap((product) => product.compatibleBoards ?? []).filter(Boolean))),
  ], [sourceProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return sourceProducts.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;
      const matchesVoltage = selectedVoltage === "All" || product.voltage?.toLowerCase() === selectedVoltage.toLowerCase();
      const matchesBoard = selectedBoard === "All" || product.compatibleBoards?.some((board) => board.toLowerCase() === selectedBoard.toLowerCase());
      const searchableDetails = [
        product.name,
        product.category,
        product.voltage,
        product.compatibleBoards?.join(" "),
        product.interfaces?.join(" "),
        product.currentRequirement,
        product.specifications,
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        searchableDetails.includes(normalizedSearch);
      return matchesCategory && matchesVoltage && matchesBoard && matchesSearch;
    });
  }, [sourceProducts, search, selectedCategory, selectedVoltage, selectedBoard]);

  const sortedProducts = useMemo(() => {
    const items = [...filteredProducts];
    const newestFirst = (a: Product, b: Product) =>
      (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
    if (sortMode === "Latest") return items.sort(newestFirst);
    if (sortMode === "Price") return items.sort((a, b) => priceDescending ? b.price - a.price : a.price - b.price);
    return items.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0) || newestFirst(a, b));
  }, [filteredProducts, priceDescending, sortMode]);

  const renderHeader = () => (
    <View>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandTagline}>MICROMART</Text>
          <Text style={styles.brandName}>Shop</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Shopping cart, ${cartItemCount} items`}
          style={styles.cartButton}
          onPress={() => router.push("/(customer)/cart")}
        >
          <Ionicons name="cart-outline" size={23} color={INK} />
          {cartItemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount > 99 ? "99+" : cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={MUTED} />
        <TextInput
          accessibilityLabel="Search products"
          placeholder="Search products..."
          placeholderTextColor="#9B9992"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          accessibilityLabel="Clear product filters"
          style={styles.filterButton}
          onPress={() => {
            setSearch("");
            setSelectedCategory("All");
            setSelectedVoltage("All");
            setSelectedBoard("All");
          }}
        >
          <Ionicons name="options-outline" size={19} color={ACCENT} />
        </TouchableOpacity>
      </View>
      <View style={styles.sortTabs}>
        {(["Popular", "Latest", "Best Sellers", "Price"] as const).map((item) => {
          const active = sortMode === item;
          return (
            <TouchableOpacity
              key={item}
              style={styles.sortTab}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (item === "Price" && sortMode === "Price") setPriceDescending((value) => !value);
                setSortMode(item);
              }}
            >
              <Text style={[styles.sortTabText, active && styles.sortTabTextActive]}>{item}</Text>
              {item === "Price" && <Ionicons name={priceDescending ? "arrow-down" : "arrow-up"} size={12} color={active ? ACCENT : MUTED} />}
              {active && <View style={styles.sortUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => {
          const active = item === selectedCategory;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedCategory(item)}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
            >
              <View style={[styles.categoryIconCircle, active && styles.categoryIconCircleActive]}>
                <Ionicons name={categoryIcon(item) as any} size={19} color={active ? "#FFF" : INK} />
              </View>
              <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{item}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <View style={styles.attributeFilters}>
        <View style={styles.attributeFilterRow}>
          <Text style={styles.attributeFilterLabel}>Voltage</Text>
          <FlatList
            horizontal
            data={voltageOptions}
            keyExtractor={(item) => `voltage-${item}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attributeChipList}
            renderItem={({ item }) => {
              const active = selectedVoltage === item;
              return (
                <TouchableOpacity
                  style={[styles.attributeChip, active && styles.attributeChipActive]}
                  onPress={() => setSelectedVoltage(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.attributeChipText, active && styles.attributeChipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
        {boardOptions.length > 1 ? (
          <View style={styles.attributeFilterRow}>
            <Text style={styles.attributeFilterLabel}>Board</Text>
            <FlatList
              horizontal
              data={boardOptions}
              keyExtractor={(item) => `board-${item}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attributeChipList}
              renderItem={({ item }) => {
                const active = selectedBoard === item;
                return (
                  <TouchableOpacity
                    style={[styles.attributeChip, active && styles.attributeChipActive]}
                    onPress={() => setSelectedBoard(item)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.attributeChipText, active && styles.attributeChipTextActive]} numberOfLines={1}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        ) : null}
      </View>
      <View style={styles.productsHeading}>
        <View>
          <Text style={styles.sectionTitle}>{selectedCategory === "All" ? "All products" : selectedCategory}</Text>
          <Text style={styles.sectionCaption}>{filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"} available</Text>
        </View>
        {(selectedCategory !== "All" || selectedVoltage !== "All" || selectedBoard !== "All" || search.length > 0) ? (
          <TouchableOpacity onPress={() => {
            setSelectedCategory("All");
            setSelectedVoltage("All");
            setSelectedBoard("All");
            setSearch("");
          }}>
            <Text style={styles.clearFilter}>Clear filter</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={[styles.productCard, { width: cardWidth }]}>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: "/(customer)/product/[id]",
            params: { id: item.id ?? "" },
          })
        }
      >
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.productImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="hardware-chip-outline"
                size={48}
                color="#B4AFA5"
              />
            </View>
          )}
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{item.category}</Text>
          </View>
          <View style={styles.favoriteButton}>
            <Ionicons name="heart-outline" size={16} color={ACCENT} />
          </View>
        </View>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
      <View style={styles.productBottomRow}>
        <View>
          <Text style={styles.productPrice}>{"\u20B1"}{item.price.toFixed(2)}</Text>
          <Text style={styles.specMeta} numberOfLines={1}>
            {[item.voltage, ...(item.compatibleBoards ?? []).slice(0, 1)].filter(Boolean).join(" · ")}
          </Text>
          <Text style={styles.stockText}>
            {item.soldCount !== undefined && item.soldCount > 0
              ? `${item.soldCount} sold`
              : item.stock > 0 ? "In stock" : "Out of stock"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={MUTED} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading the shop...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedProducts}
          keyExtractor={(item) => item.id!}
          numColumns={2}
          renderItem={renderProduct}
          ListHeaderComponent={renderHeader()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.productRow}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={28} color={ACCENT} />
              </View>
              <Text style={styles.emptyTitle}>No matching components</Text>
              <Text style={styles.emptyText}>
                Try another search or browse all categories.
              </Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSearch("");
                  setSelectedCategory("All");
                }}
              >
                <Text style={styles.resetButtonText}>Show all products</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBF7" },
  listContent: { paddingBottom: 24 },
  topBar: {
    height: 66,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: INK,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  brandTagline: { color: MUTED, fontSize: 10, marginTop: 2 },
  cartButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEEAE3",
  },
  cartBadge: {
    position: "absolute",
    right: -5,
    top: -5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
  searchBox: {
    height: 50,
    marginHorizontal: 18,
    marginTop: 5,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ECE9E2",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: INK,
    paddingHorizontal: 9,
    height: "100%",
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#F8EEEB",
    alignItems: "center",
    justifyContent: "center",
  },
  sortTabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#EDEDED",
    marginTop: 16,
    marginBottom: 14,
  },
  sortTab: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 4, position: "relative", paddingHorizontal: 5 },
  sortTabText: { color: MUTED, fontSize: 11, fontWeight: "600" },
  sortTabTextActive: { color: ACCENT },
  sortUnderline: { position: "absolute", bottom: 0, left: 5, right: 5, height: 2, borderRadius: 1, backgroundColor: ACCENT },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 18,
  },
  deliveryText: { color: MUTED, fontSize: 12, marginLeft: 5 },
  deliveryPlace: {
    color: INK,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 3,
  },
  promoCard: {
    marginHorizontal: 18,
    minHeight: 186,
    borderRadius: 22,
    backgroundColor: ACCENT,
    overflow: "hidden",
    flexDirection: "row",
    padding: 19,
    marginBottom: 25,
  },
  promoCopy: { flex: 1, zIndex: 1 },
  promoEyebrow: {
    color: "#F3C9BE",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  promoTitle: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 22,
    lineHeight: 26,
  },
  promoSubtitle: {
    color: "#F1D9D3",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
    maxWidth: 185,
  },
  promoButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    marginTop: 13,
  },
  promoButtonText: { color: INK, fontWeight: "700", fontSize: 11 },
  promoArtwork: {
    width: 112,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -10,
  },
  promoCircle: {
    position: "absolute",
    width: 122,
    height: 122,
    borderRadius: 61,
    backgroundColor: "#A85243",
    right: -22,
    top: 8,
  },
  promoFlash: { position: "absolute", right: 5, top: 26 },
  sectionHeadingRow: { paddingHorizontal: 20, marginBottom: 13 },
  sectionTitle: {
    color: INK,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sectionCaption: { color: MUTED, fontSize: 11, marginTop: 4 },
  categoryList: { paddingHorizontal: 18, gap: 14, paddingBottom: 16 },
  categoryChip: {
    width: 58,
    alignItems: "center",
    gap: 5,
  },
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#EDEDED",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconCircleActive: { backgroundColor: ACCENT },
  categoryChipActive: {},
  categoryChipText: { color: INK, fontSize: 9, fontWeight: "600", textAlign: "center" },
  categoryChipTextActive: { color: ACCENT },
  attributeFilters: { paddingHorizontal: 18, marginBottom: 13, gap: 7 },
  attributeFilterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  attributeFilterLabel: { width: 52, color: MUTED, fontSize: 10, fontWeight: "700" },
  attributeChipList: { gap: 6 },
  attributeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6E0D9", maxWidth: 150 },
  attributeChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  attributeChipText: { color: MUTED, fontSize: 10, fontWeight: "600" },
  attributeChipTextActive: { color: "#FFFFFF" },
  productsHeading: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  clearFilter: { color: ACCENT, fontSize: 11, fontWeight: "700" },
  productRow: { justifyContent: "space-between", paddingHorizontal: 18 },
  productCard: {
    backgroundColor: "#FFF",
    borderRadius: 11,
    padding: 6,
    marginBottom: 10,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#EDEDED",
    overflow: "hidden",
    position: "relative",
    marginBottom: 9,
  },
  productImage: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  categoryTag: {
    position: "absolute",
    left: 7,
    top: 7,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  categoryTagText: { color: ACCENT, fontSize: 8, fontWeight: "800" },
  favoriteButton: {
    position: "absolute",
    right: 7,
    top: 7,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    color: INK,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    minHeight: 32,
  },
  productBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  productPrice: { color: ACCENT, fontSize: 14, fontWeight: "800" },
  specMeta: { color: INK, fontSize: 9, marginTop: 3 },
  stockText: { color: MUTED, fontSize: 9, marginTop: 3 },
  soldCountText: { color: MUTED, fontSize: 9, marginTop: 3 },
  addButton: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: MUTED, fontSize: 12 },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 40,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#F8EEEB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { color: INK, fontSize: 15, fontWeight: "800" },
  emptyText: { color: MUTED, fontSize: 12, marginTop: 5, textAlign: "center" },
  resetButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 15,
  },
  resetButtonText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
});

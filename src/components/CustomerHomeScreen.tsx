import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Product, getProducts } from "../services/productService";

const ACCENT = "#932D2C";
const INK = "#24211D";
const MUTED = "#77766F";

const categoryIcon = (index: number) =>
  ([
    "hardware-chip-outline",
    "wifi-outline",
    "tablet-portrait-outline",
    "battery-charging-outline",
    "flash-outline",
    "git-network-outline",
    "construct-outline",
    "grid-outline",
  ][index % 8] as any);

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { cartItemCount } = useCart();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cardWidth = (width - 48) / 2;
  const accountName = user?.displayName?.trim() || user?.email?.split("@")[0]?.replace(/[._-]+/g, " ") || "Maker";
  const greetingName = accountName
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
  const avatarInitial = greetingName.charAt(0).toUpperCase();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadProducts = async () => {
        setIsLoading(true);
        try {
          const inventory = await getProducts();
          if (isActive) setProducts(inventory);
        } catch (error) {
          console.error("Failed to load popular products:", error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };
      loadProducts();
      return () => {
        isActive = false;
      };
    }, []),
  );

  const popularProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0)),
    [products],
  );
  const hasSalesData = popularProducts.some((product) => (product.soldCount ?? 0) > 0);
  const displayedProducts = hasSalesData ? popularProducts : popularProducts.slice(0, 6);
  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.soldCount && item.soldCount > 0 ? `${item.soldCount} sold` : `${item.stock} in stock`}`}
      style={[styles.productCard, { width: cardWidth }]}
      onPress={() =>
        router.push({
          pathname: "/(customer)/product/[id]",
          params: { id: item.id ?? "" },
        })
      }
    >
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="hardware-chip-outline" size={48} color="#B4AFA5" />
          </View>
        )}
        <View style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={16} color={ACCENT} />
        </View>
      </View>
      <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
      <View style={styles.productMeta}>
        <Text style={styles.productPrice}>{"\u20B1"}{item.price.toFixed(2)}</Text>
        <View style={styles.soldPill}>
          <Ionicons name="trending-up" size={11} color={ACCENT} />
          <Text style={styles.soldText}>
            {item.soldCount && item.soldCount > 0 ? `${item.soldCount} sold` : `${item.stock} in stock`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const header = (
    <View>
      <View style={styles.topBar}>
        <View style={styles.welcomeGroup}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{avatarInitial}</Text></View>
          )}
          <View style={styles.welcomeCopy}>
            <Text style={styles.welcomeLabel}>Welcome,</Text>
            <Text style={styles.welcomeName} numberOfLines={1}>{greetingName}</Text>
          </View>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Search products"
            style={styles.topIconButton}
            onPress={() => router.push("/(customer)/shop")}
          >
            <Ionicons name="search-outline" size={20} color={INK} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Open shopping cart, ${cartItemCount} items`}
            style={styles.topIconButton}
            onPress={() => router.push("/(customer)/cart")}
          >
            <Ionicons name="cart-outline" size={20} color={INK} />
            {cartItemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemCount > 99 ? "99+" : cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>MICROMART PICKS</Text>
          <Text style={styles.heroTitle}>Discover your next{"\n"}project favorite!</Text>
          <Text style={styles.heroCaption}>Quality components for every build.</Text>
          <TouchableOpacity style={styles.heroButton} onPress={() => router.push("/(customer)/shop")}>
            <Text style={styles.heroButtonText}>Shop now</Text>
            <Ionicons name="arrow-forward" size={14} color={INK} />
          </TouchableOpacity>
        </View>
        <View style={styles.heroArt}>
          <View style={styles.heroCircle} />
          <Ionicons name="hardware-chip-outline" size={90} color="#F4CFC4" />
          <Ionicons name="flash-outline" size={25} color="#FFE4A8" style={styles.heroFlash} />
        </View>
      </View>
      <View style={styles.categoryHeading}>
        <Text style={styles.sectionTitle}>Categories</Text>
      </View>
      <View style={styles.categoryPanel}>
        {categories.slice(0, 8).map((item, index) => (
          <TouchableOpacity key={item} style={styles.categoryShortcut} onPress={() => router.push("/(customer)/shop")}>
            <View style={styles.categoryCircle}>
          <Ionicons name={categoryIcon(index)} size={21} color={INK} />
            </View>
            <Text style={styles.categoryName} numberOfLines={1}>{item}</Text>
          </TouchableOpacity>
        ))}
        {categories.length === 0 && (
          <Text style={styles.emptyCategories}>Product categories will appear here.</Text>
        )}
      </View>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Recommended</Text>
          <Text style={styles.sectionCaption}>
            {hasSalesData ? "Popular products, ranked by units sold" : "Popular products will appear as sales are recorded"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(customer)/shop")}>
          <Text style={styles.viewAll}>Shop all</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Finding popular products...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedProducts}
          keyExtractor={(item) => item.id!}
          numColumns={2}
          renderItem={renderProduct}
          ListHeaderComponent={header}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.productRow}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={42} color="#B4AFA5" />
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptyText}>Products will appear here when they are added to the shop.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push("/(customer)/shop")}>
                <Text style={styles.emptyButtonText}>Browse all products</Text>
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
  topBar: { minHeight: 78, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  welcomeGroup: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14 },
  avatarFallback: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#EDEDED", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: ACCENT, fontSize: 16, fontWeight: "800" },
  welcomeCopy: { flexShrink: 1 },
  welcomeLabel: { color: "#77766F", fontSize: 12 },
  welcomeName: { color: INK, fontSize: 15, fontWeight: "700", marginTop: 1 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  topIconButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EDEDED", alignItems: "center", justifyContent: "center", position: "relative" },
  cartBadge: { position: "absolute", right: -4, top: -4, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
  deliveryRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 18, marginTop: 8, marginBottom: 16, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#FFFFFF", borderRadius: 15 },
  pinCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
  deliveryCopy: { flex: 1, marginLeft: 10 },
  deliveryLabel: { color: MUTED, fontSize: 10 },
  deliveryPlace: { color: INK, fontSize: 12, fontWeight: "700", marginTop: 2 },
  heroCard: { minHeight: 180, borderRadius: 22, backgroundColor: ACCENT, overflow: "hidden", flexDirection: "row", marginHorizontal: 18, marginBottom: 22, padding: 19 },
  heroCopy: { flex: 1, zIndex: 1 },
  heroEyebrow: { color: "#F3C9BE", fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  heroTitle: { color: "#FFF", fontSize: 20, lineHeight: 24, fontWeight: "800", marginTop: 7 },
  heroCaption: { color: "#F1D9D3", fontSize: 10, marginTop: 6 },
  heroButton: { alignSelf: "flex-start", backgroundColor: "#FFF", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  heroButtonText: { color: INK, fontWeight: "700", fontSize: 10 },
  heroArt: { width: 100, alignItems: "center", justifyContent: "center" },
  heroCircle: { position: "absolute", width: 112, height: 112, borderRadius: 56, backgroundColor: "#F77778", right: -15 },
  heroFlash: { position: "absolute", right: 0, top: 29 },
  categoryHeading: { paddingHorizontal: 20, marginBottom: 12 },
  categoryPanel: { marginHorizontal: 18, marginBottom: 22, paddingVertical: 16, backgroundColor: "#FFFFFF", borderRadius: 16, flexDirection: "row", flexWrap: "wrap" },
  categoryShortcut: { width: "25%", alignItems: "center", paddingVertical: 7 },
  categoryCircle: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#EDEDED", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  categoryName: { color: INK, fontSize: 9, fontWeight: "600", maxWidth: "90%" },
  emptyCategories: { padding: 12, color: MUTED, fontSize: 11 },
  sectionHeader: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 },
  sectionTitle: { color: INK, fontSize: 17, fontWeight: "800" },
  sectionCaption: { color: MUTED, fontSize: 10, marginTop: 4 },
  viewAll: { color: ACCENT, fontSize: 11, fontWeight: "700" },
  productRow: { justifyContent: "space-between", paddingHorizontal: 18 },
  productCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 7, marginBottom: 11, borderWidth: 1, borderColor: "#F0EDE7" },
  imageContainer: { width: "100%", aspectRatio: 1, borderRadius: 8, backgroundColor: "#EDEDED", overflow: "hidden", position: "relative", marginBottom: 7 },
  productImage: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  favoriteButton: { position: "absolute", right: 6, top: 6, width: 27, height: 27, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  productName: { color: INK, fontSize: 11, fontWeight: "700", marginHorizontal: 2 },
  productMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginHorizontal: 2 },
  productPrice: { color: INK, fontSize: 12, fontWeight: "700" },
  soldPill: { flexDirection: "row", alignItems: "center", gap: 3 },
  soldText: { color: MUTED, fontSize: 9 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: MUTED, fontSize: 12 },
  emptyState: { alignItems: "center", padding: 30, gap: 10 },
  emptyTitle: { color: INK, fontSize: 14, fontWeight: "800" },
  emptyText: { color: MUTED, fontSize: 12, textAlign: "center" },
  emptyButton: { backgroundColor: ACCENT, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10, marginTop: 2 },
  emptyButtonText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
});

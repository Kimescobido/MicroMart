import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { StoreOrder, watchAdminOrders } from "../services/orderService";
import { Product, watchProducts } from "../services/productService";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [dashboardError, setDashboardError] = useState(false);

  useEffect(() => {
    let active = true;
    const stopWatchingProducts = watchProducts(
      (result) => {
        if (active) {
          setProducts(result);
          setLoadingProducts(false);
        }
      },
      (error) => {
        console.error("Could not load admin dashboard inventory", error);
        if (active) {
          setDashboardError(true);
          setLoadingProducts(false);
        }
      },
    );

    const stopWatchingOrders = watchAdminOrders(
      (result) => {
        if (active) {
          setOrders(result);
          setOrdersLoaded(true);
        }
      },
      (error) => {
        console.error("Could not load admin dashboard orders", error);
        if (active) {
          setDashboardError(true);
          setOrdersLoaded(true);
        }
      },
    );
    return () => {
      active = false;
      stopWatchingProducts();
      stopWatchingOrders();
    };
  }, []);

  const pendingOrders = orders.filter(
    (order) => order.status === "pending_confirmation",
  );
  const lowStockProducts = products
    .filter((product) => product.stock > 0 && product.stock < 10)
    .sort((a, b) => a.stock - b.stock);
  const lowStockCount = lowStockProducts.length;
  const outOfStockCount = products.filter(
    (product) => product.stock <= 0,
  ).length;
  const stats = [
    {
      id: "products",
      label: "Products",
      value: products.length,
      icon: "hardware-chip-outline",
    },
    {
      id: "orders",
      label: "Order requests",
      value: pendingOrders.length,
      icon: "receipt-outline",
    },
    {
      id: "low",
      label: "Low stock",
      value: lowStockCount,
      icon: "alert-circle-outline",
    },
    {
      id: "out",
      label: "Out of stock",
      value: outOfStockCount,
      icon: "remove-circle-outline",
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>ADMIN WORKSPACE</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Welcome
            {user?.displayName
              ? `, ${user.displayName.split(" ")[0]}`
              : " back"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push("/(admin)/profile")}
          accessibilityRole="button"
          accessibilityLabel="Open admin profile"
        >
          <Ionicons name="person-outline" size={19} color="#932D2C" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Store overview</Text>
          <TouchableOpacity
            onPress={() => router.push("/(admin)/products")}
            accessibilityRole="button"
          >
            <Text style={styles.link}>Inventory</Text>
          </TouchableOpacity>
        </View>
        {dashboardError ? (
          <Text style={styles.error}>
            Some information couldn’t load. Check your connection.
          </Text>
        ) : null}
        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View key={stat.id} style={styles.statCard}>
              <View style={styles.statTop}>
                <View style={styles.statIcon}>
                  <Ionicons
                    name={stat.icon as keyof typeof Ionicons.glyphMap}
                    size={17}
                    color="#932D2C"
                  />
                </View>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
              {loadingProducts && stat.id !== "orders" ? (
                <ActivityIndicator
                  size="small"
                  color="#932D2C"
                  style={styles.statLoader}
                />
              ) : (
                <Text style={styles.statValue}>{stat.value}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.stockAlertCard}>
          <View style={styles.stockAlertHeader}>
            <View style={styles.stockAlertTitleWrap}>
              <View style={styles.stockAlertIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#A85D28"
                />
              </View>
              <View>
                <Text style={styles.stockAlertTitle}>Low stock alert</Text>
                <Text style={styles.stockAlertSubtitle}>
                  Products with 1–9 units remaining
                </Text>
              </View>
            </View>
            <Text style={styles.stockAlertCount}>
              {loadingProducts ? "…" : lowStockCount}
            </Text>
          </View>
          {loadingProducts ? (
            <Text style={styles.stockAlertEmpty}>
              Checking current stock...
            </Text>
          ) : lowStockProducts.length ? (
            <>
              {lowStockProducts.slice(0, 4).map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.stockAlertRow}
                  onPress={() => router.push("/(admin)/products")}
                  accessibilityRole="button"
                  accessibilityLabel={`${product.name}, ${product.stock} left. Open inventory.`}
                >
                  <Text style={styles.stockAlertProduct} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.stockAlertQuantity}>
                    {product.stock} left
                  </Text>
                </TouchableOpacity>
              ))}
              {lowStockProducts.length > 4 ? (
                <TouchableOpacity
                  onPress={() => router.push("/(admin)/products")}
                  accessibilityRole="button"
                >
                  <Text style={styles.stockAlertLink}>
                    View all {lowStockProducts.length} low-stock items
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Text style={styles.stockAlertEmpty}>
              No low-stock items right now.
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(admin)/add-product")}
            accessibilityRole="button"
          >
            <View style={styles.actionIcon}>
              <Ionicons name="add-circle-outline" size={21} color="#932D2C" />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Add a product</Text>
              <Text style={styles.actionSub}>List an item in your shop</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color="#A09F9B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(admin)/delivery")}
            accessibilityRole="button"
          >
            <View style={styles.actionIcon}>
              <Ionicons name="clipboard-outline" size={21} color="#932D2C" />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Review orders</Text>
              <Text style={styles.actionSub}>
                Confirm stock and manage delivery
              </Text>
            </View>
            {pendingOrders.length ? (
              <Text style={styles.badge}>{pendingOrders.length}</Text>
            ) : (
              <Ionicons name="chevron-forward" size={17} color="#A09F9B" />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionHeading, styles.ordersHeading]}>
          <Text style={styles.sectionTitle}>Needs confirmation</Text>
          <TouchableOpacity
            onPress={() => router.push("/(admin)/delivery")}
            accessibilityRole="button"
            accessibilityLabel="See all orders"
          >
            <Text style={styles.link}>See all</Text>
          </TouchableOpacity>
        </View>
        {pendingOrders.slice(0, 4).map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => router.push("/(admin)/delivery")}
            accessibilityRole="button"
          >
            <View style={styles.customerInitial}>
              <Text style={styles.initialText}>
                {order.customerName.charAt(0).toUpperCase() || "C"}
              </Text>
            </View>
            <View style={styles.orderCopy}>
              <Text style={styles.customerName} numberOfLines={1}>
                {order.customerName || "Customer"}
              </Text>
              <Text style={styles.orderMeta}>
                #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                items
              </Text>
            </View>
            <View style={styles.orderRight}>
              <Text style={styles.orderTotal}>₱{order.total.toFixed(2)}</Text>
              <Text style={styles.reviewLabel}>Needs review</Text>
            </View>
          </TouchableOpacity>
        ))}
        {ordersLoaded && pendingOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#347348"
            />
            <Text style={styles.emptyText}>
              You’re all caught up. New order requests will appear here.
            </Text>
          </View>
        ) : null}
      </ScrollView>
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
    paddingBottom: 18,
  },
  headerCopy: { flex: 1, marginRight: 12 },
  eyebrow: {
    color: "#9A948D",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  headerTitle: { color: "#2C2B27", fontSize: 21, fontWeight: "700" },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F9EBEA",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 18, paddingBottom: 30 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { color: "#2C2B27", fontSize: 16, fontWeight: "700" },
  link: { color: "#932D2C", fontSize: 12, fontWeight: "700" },
  error: { color: "#A34235", fontSize: 12, lineHeight: 18, marginBottom: 10 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 23,
  },
  statCard: {
    width: "48.5%",
    minHeight: 96,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0EFEA",
  },
  statTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 9,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F9EBEA",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { flex: 1, color: "#716A62", fontSize: 11, fontWeight: "600" },
  statValue: { color: "#24211D", fontSize: 23, fontWeight: "700" },
  statLoader: { alignSelf: "flex-start", marginTop: 4 },
  stockAlertCard: {
    backgroundColor: "#FFFAF1",
    borderWidth: 1,
    borderColor: "#F3E4C9",
    borderRadius: 16,
    padding: 13,
    marginBottom: 22,
  },
  stockAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  stockAlertTitleWrap: { flexDirection: "row", alignItems: "center", gap: 9 },
  stockAlertIcon: {
    width: 33,
    height: 33,
    borderRadius: 11,
    backgroundColor: "#F8E9CF",
    alignItems: "center",
    justifyContent: "center",
  },
  stockAlertTitle: { color: "#3B3024", fontSize: 13, fontWeight: "700" },
  stockAlertSubtitle: { color: "#8A7862", fontSize: 10, marginTop: 3 },
  stockAlertCount: { color: "#A85D28", fontSize: 16, fontWeight: "800" },
  stockAlertRow: {
    minHeight: 37,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F0E2CC",
    gap: 10,
  },
  stockAlertProduct: { flex: 1, color: "#514B45", fontSize: 12 },
  stockAlertQuantity: { color: "#A34A36", fontSize: 11, fontWeight: "700" },
  stockAlertEmpty: { color: "#8A7862", fontSize: 11, paddingTop: 4 },
  stockAlertLink: {
    color: "#932D2C",
    fontSize: 11,
    fontWeight: "700",
    paddingTop: 9,
  },
  quickActions: { gap: 9, marginBottom: 22 },
  actionCard: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F0EFEA",
    paddingHorizontal: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F9EBEA",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: { flex: 1 },
  actionTitle: { color: "#2C2B27", fontSize: 13, fontWeight: "700" },
  actionSub: { color: "#8F8982", fontSize: 10, marginTop: 3 },
  badge: {
    minWidth: 23,
    height: 23,
    borderRadius: 12,
    overflow: "hidden",
    textAlign: "center",
    textAlignVertical: "center",
    color: "#FFFFFF",
    backgroundColor: "#932D2C",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 5,
  },
  ordersHeading: { marginBottom: 10 },
  orderCard: {
    minHeight: 69,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EFEA",
    borderRadius: 15,
    padding: 12,
    marginBottom: 9,
  },
  customerInitial: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#F9EBEA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  initialText: { color: "#932D2C", fontSize: 15, fontWeight: "700" },
  orderCopy: { flex: 1, marginRight: 8 },
  customerName: { color: "#2C2B27", fontSize: 12, fontWeight: "700" },
  orderMeta: { color: "#8F8982", fontSize: 10, marginTop: 4 },
  orderRight: { alignItems: "flex-end" },
  orderTotal: { color: "#24211D", fontSize: 12, fontWeight: "700" },
  reviewLabel: {
    color: "#A36B24",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 4,
  },
  emptyCard: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 13,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0EFEA",
  },
  emptyText: { flex: 1, color: "#716A62", fontSize: 12, lineHeight: 17 },
});

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { StoreOrder, watchCustomerOrders } from "../../src/services/orderService";
import { startPayPalSandboxPayment } from "../../src/services/paypalPaymentService";

const PURCHASE_FILTERS = [
  { key: "to-pay", label: "To Pay", icon: "wallet-outline" as const },
  { key: "to-ship", label: "To Ship", icon: "cube-outline" as const },
  { key: "to-receive", label: "To Receive", icon: "bicycle-outline" as const },
  { key: "cop", label: "COP", icon: "storefront-outline" as const },
];

export default function PurchasesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ status?: string }>();
  const [activeFilter, setActiveFilter] = useState(
    PURCHASE_FILTERS.some((filter) => filter.key === params.status)
      ? params.status!
      : PURCHASE_FILTERS[0].key,
  );
  const activeStatus = PURCHASE_FILTERS.find((filter) => filter.key === activeFilter) ?? PURCHASE_FILTERS[0];
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = watchCustomerOrders(
      user.uid,
      (nextOrders) => {
        setOrders(nextOrders);
        setLoading(false);
        setLoadError("");
      },
      (error) => {
        console.error("Could not load customer orders", error);
        setLoadError("Orders couldn’t be loaded. Check your connection and try again.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [user?.uid]);

  const orderStatus = activeFilter.replace(/-/g, "_");
  const filteredOrders = useMemo(() => orders.filter((order) =>
    orderStatus === "to_pay"
      ? order.status === "to_pay" || order.status === "pending_confirmation"
      : order.status === orderStatus,
  ), [orders, orderStatus]);

  const payWithPayPal = async (order: StoreOrder) => {
    setPayingOrderId(order.id);
    try {
      const result = await startPayPalSandboxPayment(order.id);
      if (result.status === "paid") {
        Alert.alert("Payment complete", "PayPal confirmed your payment. Your order status is updating.");
      } else {
        Alert.alert("Payment cancelled", "Your order is still waiting for payment. You can try again anytime.");
      }
    } catch (error) {
      console.error("PayPal sandbox checkout failed", error);
      Alert.alert("Payment could not be completed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPayingOrderId(null);
    }
  };

  const renderOrder = ({ item }: { item: StoreOrder }) => {
    const itemNames = item.items.map((orderItem) => `${orderItem.name} × ${orderItem.quantity}`).join(" · ");
    const dateValue = typeof item.createdAt === "number" ? item.createdAt : item.createdAt?.toMillis?.() ?? Date.now();
    const statusLabel = item.status === "pending_confirmation" ? "Waiting for shop confirmation" : item.status === "to_receive" ? "On the way" : item.status === "to_ship" ? "Preparing order" : item.status === "cop" ? "Awaiting pickup" : item.paymentMethod === "PAYPAL" && item.status === "to_pay" ? "Ready for PayPal payment" : "Awaiting payment";
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderTopRow}>
          <Text style={styles.orderNumber}>Order #{item.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{new Date(dateValue).toLocaleDateString()}</Text>
        </View>
        <View style={styles.orderStatusRow}>
          <Ionicons name={activeStatus.icon} size={15} color="#932D2C" />
          <Text style={styles.orderStatus}>{statusLabel}</Text>
          <Text style={styles.paymentMethod}>{item.paymentMethod}</Text>
        </View>
        <Text style={styles.orderItems} numberOfLines={2}>{itemNames}</Text>
        {item.status === "to_receive" && item.assignedDeliveryName ? (
          <Text style={styles.driverLine}>Delivery person: {item.assignedDeliveryName}</Text>
        ) : null}
        {item.status === "cop" && item.pickupLocation ? (
          <Text style={styles.driverLine}>Pickup: {item.pickupLocation}</Text>
        ) : null}
        <View style={styles.orderBottomRow}>
          <Text style={styles.itemCount}>{item.items.reduce((sum, orderItem) => sum + orderItem.quantity, 0)} items</Text>
          <Text style={styles.orderTotal}>₱{item.total.toFixed(2)}</Text>
        </View>
        {item.status === "to_pay" && item.paymentMethod === "PAYPAL" && item.paymentStatus !== "paid" ? (
          <TouchableOpacity
            style={[styles.payPalButton, payingOrderId === item.id && styles.payPalButtonDisabled]}
            onPress={() => payWithPayPal(item)}
            disabled={payingOrderId === item.id}
          >
            {payingOrderId === item.id ? <ActivityIndicator size="small" color="#FFFFFF" /> : <>
              <Ionicons name="logo-paypal" size={17} color="#FFFFFF" />
              <Text style={styles.payPalButtonText}>Pay with PayPal Sandbox</Text>
            </>}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to profile">
          <Ionicons name="arrow-back" size={20} color="#24211D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Purchases</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.filterRow}>
        {PURCHASE_FILTERS.map((filter) => {
          const selected = filter.key === activeFilter;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterButton, selected && styles.filterButtonActive]}
              onPress={() => setActiveFilter(filter.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Ionicons name={filter.icon} size={16} color={selected ? "#932D2C" : "#8F8982"} />
              <Text style={[styles.filterText, selected && styles.filterTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.emptyState}><ActivityIndicator size="large" color="#932D2C" /></View>
      ) : loadError ? (
        <View style={styles.emptyState}><Ionicons name="cloud-offline-outline" size={34} color="#932D2C" /><Text style={styles.emptyDescription}>{loadError}</Text></View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}><Ionicons name={activeStatus.icon} size={34} color="#932D2C" /></View>
          <Text style={styles.emptyTitle}>No {activeStatus.label} orders yet</Text>
          <Text style={styles.emptyDescription}>Orders in this section will show here with their items and delivery progress.</Text>
          <TouchableOpacity style={styles.shopButton} onPress={() => router.replace("/(customer)/shop")}>
            <Text style={styles.shopButtonText}>Browse shop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(order) => order.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.orderList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBF7" },
  header: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 },
  backButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#24211D", fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 38 },
  filterRow: { flexDirection: "row", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#EDEDED", paddingHorizontal: 5 },
  filterButton: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, borderBottomWidth: 2, borderBottomColor: "transparent", paddingHorizontal: 2 },
  filterButtonActive: { borderBottomColor: "#932D2C" },
  filterText: { color: "#8F8982", fontSize: 10, fontWeight: "500" },
  filterTextActive: { color: "#932D2C", fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 38, paddingBottom: 44 },
  emptyIconCircle: { width: 84, height: 84, borderRadius: 28, backgroundColor: "#F9EBEA", alignItems: "center", justifyContent: "center", marginBottom: 17 },
  emptyTitle: { color: "#24211D", fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyDescription: { color: "#8F8982", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 8 },
  shopButton: { backgroundColor: "#932D2C", borderRadius: 13, paddingHorizontal: 19, paddingVertical: 12, marginTop: 20 },
  shopButtonText: { color: "#FFFBF7", fontSize: 13, fontWeight: "700" },
  orderList: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  orderCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#EEEAE4", padding: 14, marginBottom: 11 },
  orderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 9 },
  orderNumber: { color: "#24211D", fontSize: 12, fontWeight: "700" },
  orderDate: { color: "#9A948D", fontSize: 10 },
  orderStatusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  orderStatus: { flex: 1, color: "#932D2C", fontSize: 12, fontWeight: "700" },
  paymentMethod: { color: "#8F8982", fontSize: 10, fontWeight: "700" },
  orderItems: { color: "#514B45", fontSize: 12, lineHeight: 17 },
  driverLine: { color: "#746D65", fontSize: 11, marginTop: 7 },
  orderBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F0EDE7", marginTop: 11, paddingTop: 10 },
  itemCount: { color: "#8F8982", fontSize: 11 },
  orderTotal: { color: "#24211D", fontSize: 14, fontWeight: "700" },
  payPalButton: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#003087", borderRadius: 12, marginTop: 12 },
  payPalButtonDisabled: { opacity: 0.65 },
  payPalButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});

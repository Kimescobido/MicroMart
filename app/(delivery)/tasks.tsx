import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogoutButton } from "../../src/components/LogoutButton";
import { useAuth } from "../../src/context/AuthContext";
import { completeAssignedDelivery, StoreOrder, watchAssignedDeliveries } from "../../src/services/orderService";

export default function DeliveryTasksScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setOrders([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    return watchAssignedDeliveries(
      user.uid,
      (nextOrders) => {
        setOrders(nextOrders);
        setIsLoading(false);
      },
      (error) => {
        console.error("Could not load assigned deliveries", error);
        setIsLoading(false);
        Alert.alert("Tasks unavailable", "Check your connection or ask the admin to check delivery access.");
      },
    );
  }, [user?.uid]);

  const markDelivered = (order: StoreOrder) => {
    const paymentConfirmation = order.paymentMethod === "COD"
      ? "was delivered and cash was collected?"
      : "was delivered to the customer?";
    Alert.alert("Confirm delivery", `Confirm that order ${order.id.slice(0, 8).toUpperCase()} ${paymentConfirmation}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delivered",
        onPress: async () => {
          if (!user?.uid) return;
          setBusyOrderId(order.id);
          try {
            await completeAssignedDelivery(order.id, user.uid);
          } catch (error) {
            Alert.alert("Could not update delivery", error instanceof Error ? error.message : "Try again.");
          } finally {
            setBusyOrderId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="bicycle-outline" size={22} color="#932D2C" /></View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>DELIVERY PARTNER</Text>
          <Text style={styles.title}>My Deliveries</Text>
        </View>
        <View style={styles.taskCount}><Text style={styles.taskCountText}>{orders.length}</Text></View>
        <LogoutButton compact />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#932D2C" /></View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="clipboard-outline" size={36} color="#932D2C" /></View>
          <Text style={styles.emptyTitle}>No assigned deliveries</Text>
          <Text style={styles.emptyCopy}>New orders assigned by the admin will appear here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {orders.map((order) => {
            const address = order.deliveryAddress;
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
                  <View style={styles.codPill}><Text style={styles.codText}>{order.paymentMethod}</Text></View>
                </View>
                <View style={styles.recipientRow}>
                  <View style={styles.recipientIcon}><Ionicons name="person-outline" size={17} color="#932D2C" /></View>
                  <View style={styles.recipientCopy}>
                    <Text style={styles.recipientName}>{order.customerName}</Text>
                    <Text style={styles.phone}>{order.customerPhone}</Text>
                  </View>
                  <TouchableOpacity style={styles.callButton} onPress={() => Alert.alert("Customer phone", order.customerPhone)} accessibilityLabel="Show customer phone">
                    <Ionicons name="call-outline" size={17} color="#932D2C" />
                  </TouchableOpacity>
                </View>
                <View style={styles.addressBox}>
                  <Ionicons name="location-outline" size={18} color="#932D2C" />
                  <Text style={styles.addressText}>
                    {[address?.streetAddress, address?.barangay, address?.city, address?.province].filter(Boolean).join(", ")}
                    {address?.landmark ? `\nLandmark: ${address.landmark}` : ""}
                  </Text>
                </View>
                <View style={styles.divider} />
                <Text style={styles.itemsHeading}>Items to deliver</Text>
                {order.items.map((item) => (
                  <View key={item.productId} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemQuantity}>× {item.quantity}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{order.paymentMethod === "COD" ? "Collect cash" : "Order total"}</Text>
                  <Text style={styles.totalValue}>₱{order.total.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.completeButton, busyOrderId === order.id && styles.buttonDisabled]}
                  onPress={() => markDelivered(order)}
                  disabled={busyOrderId === order.id}
                >
                  {busyOrderId === order.id ? <ActivityIndicator color="#FFFBF7" /> : <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFBF7" />
                    <Text style={styles.completeButtonText}>Mark as delivered</Text>
                  </>}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBF7" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 15 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#F9EBEA", alignItems: "center", justifyContent: "center", marginRight: 11 },
  headerText: { flex: 1 },
  eyebrow: { color: "#9A948D", fontSize: 9, fontWeight: "700", letterSpacing: 1.1 },
  title: { color: "#24211D", fontSize: 21, fontWeight: "700", marginTop: 3 },
  taskCount: { minWidth: 28, height: 28, paddingHorizontal: 7, borderRadius: 14, backgroundColor: "#932D2C", alignItems: "center", justifyContent: "center" },
  taskCountText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyIcon: { width: 82, height: 82, borderRadius: 26, backgroundColor: "#F9EBEA", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { color: "#24211D", fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyCopy: { color: "#8F8982", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7 },
  list: { paddingHorizontal: 16, paddingBottom: 28 },
  orderCard: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#EEEAE4", padding: 15, marginBottom: 12 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13 },
  orderId: { color: "#24211D", fontSize: 13, fontWeight: "700" },
  codPill: { backgroundColor: "#FFF4E3", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  codText: { color: "#9A6418", fontSize: 10, fontWeight: "700" },
  recipientRow: { flexDirection: "row", alignItems: "center", marginBottom: 11 },
  recipientIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#F9EBEA", alignItems: "center", justifyContent: "center", marginRight: 9 },
  recipientCopy: { flex: 1 },
  recipientName: { color: "#24211D", fontSize: 13, fontWeight: "700" },
  phone: { color: "#8F8982", fontSize: 11, marginTop: 3 },
  callButton: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, borderColor: "#F0EDE7", alignItems: "center", justifyContent: "center" },
  addressBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FFFBF7", borderRadius: 12, padding: 11, gap: 8 },
  addressText: { flex: 1, color: "#514B45", fontSize: 12, lineHeight: 18 },
  divider: { height: 1, backgroundColor: "#F0EDE7", marginVertical: 12 },
  itemsHeading: { color: "#8F8982", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 7 },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  itemName: { flex: 1, color: "#514B45", fontSize: 12, marginRight: 10 },
  itemQuantity: { color: "#24211D", fontSize: 12, fontWeight: "600" },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 9, marginTop: 5, borderTopWidth: 1, borderTopColor: "#F0EDE7" },
  totalLabel: { color: "#514B45", fontSize: 12, fontWeight: "600" },
  totalValue: { color: "#24211D", fontSize: 16, fontWeight: "700" },
  completeButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 13, backgroundColor: "#932D2C", marginTop: 12 },
  completeButtonText: { color: "#FFFBF7", fontSize: 13, fontWeight: "700" },
  buttonDisabled: { opacity: 0.65 },
});

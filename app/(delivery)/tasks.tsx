import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
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
    if (!user?.uid) return;
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

  const callCustomer = async (phone: string) => {
    const phoneNumber = phone.replace(/[^\d+]/g, "");
    if (!phoneNumber) {
      Alert.alert("Phone number unavailable", "This order doesn’t have a usable customer phone number.");
      return;
    }
    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch {
      Alert.alert("Couldn't open phone", `Call the customer at ${phone}.`);
    }
  };

  const openDirections = async (order: StoreOrder) => {
    const address = order.deliveryAddress;
    const destination = [address?.streetAddress, address?.barangay, address?.landmark, address?.city, address?.province]
      .filter(Boolean)
      .join(", ");
    if (!destination) {
      Alert.alert("Delivery address unavailable", "This order doesn’t have an address to navigate to.");
      return;
    }
    try {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`);
    } catch {
      Alert.alert("Couldn't open maps", destination);
    }
  };

  const codDue = orders
    .filter((order) => order.paymentMethod === "COD")
    .reduce((sum, order) => sum + order.total, 0);

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
          <Text style={styles.emptyTitle}>You’re all caught up</Text>
          <Text style={styles.emptyCopy}>New deliveries assigned by the admin will appear here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}><Ionicons name="bicycle-outline" size={18} color="#932D2C" /></View>
              <Text style={styles.summaryLabel}>Assigned stops</Text>
              <Text style={styles.summaryValue}>{orders.length}</Text>
            </View>
            <View style={[styles.summaryCard, styles.cashSummaryCard]}>
              <View style={styles.summaryIcon}><Ionicons name="cash-outline" size={18} color="#9A6418" /></View>
              <Text style={styles.summaryLabel}>COD to collect</Text>
              <Text style={styles.summaryValue}>₱{codDue.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.listHeading}>
            <View style={styles.listHeadingCopy}>
              <Text style={styles.listTitle}>Active deliveries</Text>
              <Text style={styles.listSubtitle}>Contact the customer, check the address, then confirm delivery.</Text>
            </View>
            <Text style={styles.listCount}>{orders.length}</Text>
          </View>
          {orders.map((order) => {
            const address = order.deliveryAddress;
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
                  <View style={[styles.codPill, order.paymentMethod === "PAYPAL" && styles.onlinePill]}>
                    <Ionicons name={order.paymentMethod === "COD" ? "cash-outline" : "checkmark-circle-outline"} size={12} color={order.paymentMethod === "COD" ? "#9A6418" : "#347348"} />
                    <Text style={[styles.codText, order.paymentMethod === "PAYPAL" && styles.onlineText]}>{order.paymentMethod === "COD" ? "COD" : "PAID ONLINE"}</Text>
                  </View>
                </View>
                <View style={styles.recipientRow}>
                  <View style={styles.recipientIcon}><Ionicons name="person-outline" size={17} color="#932D2C" /></View>
                  <View style={styles.recipientCopy}>
                    <Text style={styles.recipientName} numberOfLines={1}>{order.customerName}</Text>
                    <Text style={styles.phone}>{order.customerPhone}</Text>
                  </View>
                  <TouchableOpacity style={styles.callButton} onPress={() => void callCustomer(order.customerPhone)} accessibilityRole="button" accessibilityLabel={`Call ${order.customerName}`}>
                    <Ionicons name="call-outline" size={17} color="#932D2C" />
                    <Text style={styles.callLabel}>Call</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.addressBox}>
                  <Ionicons name="location-outline" size={18} color="#932D2C" />
                  <View style={styles.addressCopy}>
                    <Text style={styles.addressText}>
                      {[address?.streetAddress, address?.barangay, address?.city, address?.province].filter(Boolean).join(", ")}
                    </Text>
                    {address?.landmark ? <Text style={styles.landmarkText}>Landmark: {address.landmark}</Text> : null}
                    <TouchableOpacity style={styles.directionsButton} onPress={() => void openDirections(order)} accessibilityRole="button" accessibilityLabel="Open delivery directions">
                      <Ionicons name="navigate-outline" size={14} color="#932D2C" />
                      <Text style={styles.directionsText}>Directions</Text>
                    </TouchableOpacity>
                  </View>
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
                  <Text style={styles.totalLabel}>{order.paymentMethod === "COD" ? "Cash to collect" : "Paid online"}</Text>
                  <Text style={styles.totalValue}>₱{order.total.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.completeButton, busyOrderId === order.id && styles.buttonDisabled]}
                  onPress={() => markDelivered(order)}
                  disabled={busyOrderId === order.id}
                >
                  {busyOrderId === order.id ? <ActivityIndicator color="#FFFBF7" /> : <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFBF7" />
                    <Text style={styles.completeButtonText}>Confirm delivery</Text>
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
  summaryRow: { flexDirection: "row", gap: 9, marginBottom: 21 },
  summaryCard: { flex: 1, minHeight: 104, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EEEAE4", borderRadius: 16, padding: 12 },
  cashSummaryCard: { backgroundColor: "#FFFAF1", borderColor: "#F3E7D0" },
  summaryIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: "#F9EBEA", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  summaryLabel: { color: "#716A62", fontSize: 10, fontWeight: "600" },
  summaryValue: { color: "#24211D", fontSize: 19, fontWeight: "700", marginTop: 3 },
  listHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  listHeadingCopy: { flex: 1, marginRight: 10 },
  listTitle: { color: "#24211D", fontSize: 16, fontWeight: "700" },
  listSubtitle: { color: "#8F8982", fontSize: 10, lineHeight: 15, marginTop: 4 },
  listCount: { minWidth: 25, height: 25, borderRadius: 13, backgroundColor: "#F9EBEA", color: "#932D2C", overflow: "hidden", textAlign: "center", textAlignVertical: "center", fontSize: 11, fontWeight: "700", paddingHorizontal: 6 },
  orderCard: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#EEEAE4", padding: 15, marginBottom: 12 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13 },
  orderId: { color: "#24211D", fontSize: 13, fontWeight: "700" },
  codPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF4E3", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  codText: { color: "#9A6418", fontSize: 10, fontWeight: "700" },
  onlinePill: { backgroundColor: "#EAF5EC" },
  onlineText: { color: "#347348" },
  recipientRow: { flexDirection: "row", alignItems: "center", marginBottom: 11 },
  recipientIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#F9EBEA", alignItems: "center", justifyContent: "center", marginRight: 9 },
  recipientCopy: { flex: 1 },
  recipientName: { color: "#24211D", fontSize: 13, fontWeight: "700" },
  phone: { color: "#8F8982", fontSize: 11, marginTop: 3 },
  callButton: { minWidth: 66, height: 38, paddingHorizontal: 10, borderRadius: 11, borderWidth: 1, borderColor: "#E9D6D4", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  callLabel: { color: "#932D2C", fontSize: 11, fontWeight: "700" },
  addressBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FFFBF7", borderRadius: 12, padding: 11, gap: 8 },
  addressCopy: { flex: 1 },
  addressText: { color: "#514B45", fontSize: 12, lineHeight: 18 },
  landmarkText: { color: "#8F8982", fontSize: 10, lineHeight: 15, marginTop: 3 },
  directionsButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, paddingVertical: 7, paddingRight: 8, marginTop: 3 },
  directionsText: { color: "#932D2C", fontSize: 11, fontWeight: "700" },
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

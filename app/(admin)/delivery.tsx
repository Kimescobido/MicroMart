import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import {
  assignOrderToDelivery,
  confirmCustomerOrder,
  completePickupOrder,
  DeliveryStaff,
  rejectCustomerOrder,
  StoreOrder,
  watchAdminOrders,
  watchDeliveryStaff,
} from "../../src/services/orderService";

type OrderQueue = "requests" | "delivery" | "pickup";

export default function AdminDeliveryScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [staff, setStaff] = useState<DeliveryStaff[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [activeQueue, setActiveQueue] = useState<OrderQueue>("requests");

  useEffect(() => {
    let ordersLoaded = false;
    const updateLoading = () => setIsLoading(!ordersLoaded);
    const stopOrders = watchAdminOrders(
      (nextOrders) => {
        setOrders(nextOrders);
        ordersLoaded = true;
        updateLoading();
      },
      (error) => {
        console.error("Could not load admin order queue", error);
        ordersLoaded = true;
        updateLoading();
        Alert.alert("Orders unavailable", "Check Firestore access and try again.");
      },
    );
    const stopStaff = watchDeliveryStaff(
      setStaff,
      (error) => console.error("Could not load delivery staff", error),
    );
    return () => {
      stopOrders();
      stopStaff();
    };
  }, []);

  const assign = async (order: StoreOrder, deliveryPerson: DeliveryStaff) => {
    setBusyOrderId(order.id);
    try {
      await assignOrderToDelivery(order.id, deliveryPerson);
      setSelectedOrder(null);
    } catch (error) {
      Alert.alert("Could not assign order", error instanceof Error ? error.message : "Try again.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const confirmOrder = async (order: StoreOrder) => {
    if (!user?.uid) {
      Alert.alert("Admin sign-in required", "Sign in with an admin account to confirm orders.");
      return;
    }
    setBusyOrderId(order.id);
    try {
      await confirmCustomerOrder(order.id, user.uid);
      Alert.alert("Order confirmed", "Available stock has been deducted and the order is ready for fulfillment.");
    } catch (error) {
      Alert.alert("Could not confirm order", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const rejectOrder = (order: StoreOrder) => {
    if (!user?.uid) return;
    Alert.alert("Reject order request", "This will cancel the request. Inventory will remain unchanged.", [
      { text: "Keep request", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          setBusyOrderId(order.id);
          try {
            await rejectCustomerOrder(order.id, user.uid);
          } catch (error) {
            Alert.alert("Could not reject order", error instanceof Error ? error.message : "Please try again.");
          } finally {
            setBusyOrderId(null);
          }
        },
      },
    ]);
  };

  const markPickupComplete = async (order: StoreOrder) => {
    Alert.alert("Confirm pickup", `Mark order ${order.id.slice(0, 8).toUpperCase()} as collected and paid?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm pickup",
        onPress: async () => {
          setBusyOrderId(order.id);
          try {
            await completePickupOrder(order.id);
          } catch (error) {
            Alert.alert("Could not complete pickup", error instanceof Error ? error.message : "Try again.");
          } finally {
            setBusyOrderId(null);
          }
        },
      },
    ]);
  };

  const pendingOrders = orders.filter((order) => order.status === "pending_confirmation");
  const deliveryOrders = orders.filter((order) => order.fulfillmentType === "delivery" && order.status !== "pending_confirmation");
  const pickupOrders = orders.filter((order) => order.fulfillmentType === "pickup" && order.status === "cop");
  const queues: { key: OrderQueue; label: string; count: number; icon: "clipboard-outline" | "bicycle-outline" | "storefront-outline" }[] = [
    { key: "requests", label: "Requests", count: pendingOrders.length, icon: "clipboard-outline" },
    { key: "delivery", label: "Delivery", count: deliveryOrders.length, icon: "bicycle-outline" },
    { key: "pickup", label: "Pickup", count: pickupOrders.length, icon: "storefront-outline" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>FULFILLMENT</Text>
        <Text style={styles.title}>Orders & Delivery</Text>
        <Text style={styles.subtitle}>Confirm requests, assign deliveries, and complete pickups.</Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color="#932D2C" /></View>
      ) : (
        <>
        <View style={styles.queueTabs}>
          {queues.map((queue) => {
            const selected = activeQueue === queue.key;
            return (
              <TouchableOpacity
                key={queue.key}
                style={[styles.queueTab, selected && styles.queueTabSelected]}
                onPress={() => setActiveQueue(queue.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Ionicons name={queue.icon} size={16} color={selected ? "#932D2C" : "#8F8982"} />
                <Text style={[styles.queueTabLabel, selected && styles.queueTabLabelSelected]}>{queue.label}</Text>
                <Text style={[styles.queueTabCount, selected && styles.queueTabCountSelected]}>{queue.count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeQueue === "requests" ? <>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Order requests</Text>
            <Text style={styles.sectionCount}>{pendingOrders.length}</Text>
          </View>
          <Text style={styles.queueHint}>Check each request, then confirm available stock or reject it.</Text>
          {pendingOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                <View style={styles.pendingPill}><Text style={styles.pendingPillText}>Needs confirmation</Text></View>
              </View>
              <Text style={styles.customerName}>{order.customerName} · {order.customerPhone}</Text>
              {order.fulfillmentType === "delivery" ? (
                <Text style={styles.addressText}>
                  {[order.deliveryAddress?.streetAddress, order.deliveryAddress?.barangay, order.deliveryAddress?.city, order.deliveryAddress?.province]
                    .filter(Boolean).join(", ")}
                </Text>
              ) : (
                <Text style={styles.addressText}>{order.paymentMethod === "COP" ? "Cash on pickup" : "Online payment"} · {order.pickupLocation}</Text>
              )}
              <Text style={styles.itemText} numberOfLines={2}>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(" · ")}</Text>
              <View style={styles.requestFooter}>
                <Text style={styles.orderTotal}>₱{order.total.toFixed(2)} · {order.paymentMethod}</Text>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.rejectButton, busyOrderId === order.id && styles.buttonDisabled]}
                    onPress={() => rejectOrder(order)}
                    disabled={busyOrderId === order.id}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, busyOrderId === order.id && styles.buttonDisabled]}
                    onPress={() => confirmOrder(order)}
                    disabled={busyOrderId === order.id}
                  >
                    {busyOrderId === order.id ? <ActivityIndicator color="#FFFBF7" size="small" /> : <Text style={styles.confirmButtonText}>Confirm</Text>}
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.stockNote}>Stock is deducted only after confirmation.</Text>
            </View>
          ))}
          {pendingOrders.length === 0 ? <View style={styles.queueEmpty}><Ionicons name="checkmark-circle-outline" size={25} color="#347348" /><Text style={styles.queueEmptyTitle}>No requests to review</Text><Text style={styles.queueEmptyCopy}>New customer orders will show up here.</Text></View> : null}
          </> : null}

          {activeQueue === "delivery" ? <>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Delivery orders</Text>
            <Text style={styles.sectionCount}>{deliveryOrders.length}</Text>
          </View>
          <Text style={styles.queueHint}>Assign confirmed orders to a delivery partner and track assignments.</Text>
          {deliveryOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                <View style={[styles.statusPill, order.status === "to_receive" && styles.statusPillActive]}>
                  <Text style={[styles.statusText, order.status === "to_receive" && styles.statusTextActive]}>
                    {order.status === "to_receive" ? "Out for delivery" : "Needs assignment"}
                  </Text>
                </View>
              </View>
              <Text style={styles.customerName}>{order.customerName} · {order.customerPhone}</Text>
              {order.pickupLocation ? <Text style={styles.addressText}>Pickup point: {order.pickupLocation}</Text> : null}
              <Text style={styles.addressText}>
                {[order.deliveryAddress?.streetAddress, order.deliveryAddress?.barangay, order.deliveryAddress?.city, order.deliveryAddress?.province]
                  .filter(Boolean).join(", ")}
              </Text>
              <Text style={styles.itemText} numberOfLines={2}>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(" · ")}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.orderTotal}>₱{order.total.toFixed(2)} · {order.paymentMethod}</Text>
                {order.status === "to_ship" ? (
                  <TouchableOpacity style={styles.assignButton} onPress={() => setSelectedOrder(order)}>
                    <Ionicons name="person-add-outline" size={15} color="#FFFBF7" />
                    <Text style={styles.assignButtonText}>Assign</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.assignee}>Assigned: {order.assignedDeliveryName || "Delivery person"}</Text>
                )}
              </View>
            </View>
          ))}
          {deliveryOrders.length === 0 ? <View style={styles.queueEmpty}><Ionicons name="bicycle-outline" size={25} color="#932D2C" /><Text style={styles.queueEmptyTitle}>No delivery orders yet</Text><Text style={styles.queueEmptyCopy}>Confirmed delivery orders will appear here.</Text></View> : null}
          </> : null}

          {activeQueue === "pickup" ? <>
          <View style={[styles.sectionHeadingRow, styles.pickupHeading]}>
            <Text style={styles.sectionTitle}>Pickup orders</Text>
            <Text style={styles.sectionCount}>{pickupOrders.length}</Text>
          </View>
          <Text style={styles.queueHint}>Mark an order collected after the customer picks it up.</Text>
          {pickupOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                <View style={[styles.statusPill, styles.pickupStatus]}><Text style={[styles.statusText, styles.pickupStatusText]}>Awaiting pickup</Text></View>
              </View>
              <Text style={styles.customerName}>{order.customerName} · {order.customerPhone}</Text>
              <Text style={styles.itemText} numberOfLines={2}>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(" · ")}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.orderTotal}>₱{order.total.toFixed(2)} · {order.paymentMethod}</Text>
                <TouchableOpacity
                  style={[styles.pickupButton, busyOrderId === order.id && styles.buttonDisabled]}
                  onPress={() => markPickupComplete(order)}
                  disabled={busyOrderId === order.id}
                >
                  {busyOrderId === order.id ? <ActivityIndicator color="#932D2C" size="small" /> : <Text style={styles.pickupButtonText}>Mark collected</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {pickupOrders.length === 0 ? <View style={styles.queueEmpty}><Ionicons name="storefront-outline" size={25} color="#932D2C" /><Text style={styles.queueEmptyTitle}>No pickups waiting</Text><Text style={styles.queueEmptyCopy}>Pickup orders will appear here after confirmation.</Text></View> : null}
          </> : null}
        </ScrollView>
        </>
      )}

      <Modal visible={Boolean(selectedOrder)} transparent animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.assignModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assign delivery person</Text>
                <Text style={styles.modalSubtitle}>Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedOrder(null)}><Ionicons name="close" size={20} color="#24211D" /></TouchableOpacity>
            </View>
            {staff.length === 0 ? (
              <Text style={styles.noStaff}>No delivery accounts were found. Add a user with the delivery role first.</Text>
            ) : (
              <ScrollView style={styles.staffList}>
                {staff.map((person) => (
                  <TouchableOpacity
                    key={person.uid}
                    style={styles.staffRow}
                    onPress={() => selectedOrder && assign(selectedOrder, person)}
                    disabled={busyOrderId === selectedOrder?.id}
                  >
                    <View style={styles.staffAvatar}><Ionicons name="person-outline" size={19} color="#932D2C" /></View>
                    <View style={styles.staffCopy}><Text style={styles.staffName}>{person.fullName}</Text><Text style={styles.staffEmail}>{person.email}</Text></View>
                    {busyOrderId === selectedOrder?.id ? <ActivityIndicator size="small" color="#932D2C" /> : <Ionicons name="chevron-forward" size={18} color="#A09F9B" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBF7" },
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 16 },
  eyebrow: { color: "#9A948D", fontSize: 10, letterSpacing: 1.2, fontWeight: "700" },
  title: { color: "#24211D", fontFamily: "serif", fontSize: 24, fontWeight: "700", marginTop: 3 },
  subtitle: { color: "#8F8982", fontSize: 12, marginTop: 4 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  queueTabs: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, padding: 4, gap: 4, backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#EEEAE4" },
  queueTab: { flex: 1, minHeight: 43, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 11, paddingHorizontal: 3 },
  queueTabSelected: { backgroundColor: "#F9EBEA" },
  queueTabLabel: { color: "#716A62", fontSize: 10, fontWeight: "600" },
  queueTabLabelSelected: { color: "#932D2C", fontWeight: "700" },
  queueTabCount: { minWidth: 18, height: 18, borderRadius: 9, overflow: "hidden", textAlign: "center", textAlignVertical: "center", backgroundColor: "#F0EDE7", color: "#716A62", fontSize: 9, fontWeight: "700", paddingHorizontal: 4 },
  queueTabCountSelected: { backgroundColor: "#FFFFFF", color: "#932D2C" },
  queueHint: { color: "#8F8982", fontSize: 11, lineHeight: 16, marginTop: -5, marginBottom: 12 },
  queueEmpty: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 35, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#EEEAE4", marginTop: 5 },
  queueEmptyTitle: { color: "#24211D", fontSize: 14, fontWeight: "700", marginTop: 10 },
  queueEmptyCopy: { color: "#8F8982", fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 5 },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 11 },
  sectionTitle: { color: "#24211D", fontSize: 16, fontWeight: "700" },
  sectionCount: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: "#F9EBEA", color: "#932D2C", overflow: "hidden", textAlign: "center", textAlignVertical: "center", fontSize: 11, fontWeight: "700", paddingHorizontal: 5 },
  orderCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EEEAE4", borderRadius: 16, padding: 13, marginBottom: 10 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 9 },
  orderId: { color: "#24211D", fontSize: 12, fontWeight: "700" },
  statusPill: { backgroundColor: "#FFF4E3", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 },
  statusPillActive: { backgroundColor: "#EAF5EC" },
  statusText: { color: "#9A6418", fontSize: 10, fontWeight: "700" },
  statusTextActive: { color: "#347348" },
  pendingPill: { backgroundColor: "#FFF4E3", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 },
  pendingPillText: { color: "#9A6418", fontSize: 10, fontWeight: "700" },
  pickupStatus: { backgroundColor: "#F9EBEA" },
  pickupStatusText: { color: "#932D2C" },
  customerName: { color: "#3E3934", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  addressText: { color: "#716A62", fontSize: 11, lineHeight: 16, marginBottom: 7 },
  itemText: { color: "#716A62", fontSize: 11, lineHeight: 16 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderTopWidth: 1, borderTopColor: "#F0EDE7", marginTop: 10, paddingTop: 10 },
  requestFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderTopWidth: 1, borderTopColor: "#F0EDE7", marginTop: 10, paddingTop: 10 },
  requestActions: { flexDirection: "row", alignItems: "center", gap: 7 },
  rejectButton: { borderWidth: 1, borderColor: "#E8E3DC", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  rejectButtonText: { color: "#716A62", fontSize: 11, fontWeight: "700" },
  confirmButton: { backgroundColor: "#932D2C", borderRadius: 10, minWidth: 66, alignItems: "center", paddingHorizontal: 10, paddingVertical: 8 },
  confirmButtonText: { color: "#FFFBF7", fontSize: 11, fontWeight: "700" },
  stockNote: { color: "#8F8982", fontSize: 10, marginTop: 7 },
  orderTotal: { color: "#24211D", fontSize: 12, fontWeight: "700", flex: 1 },
  assignButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#932D2C", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  assignButtonText: { color: "#FFFBF7", fontSize: 11, fontWeight: "700" },
  assignee: { color: "#347348", fontSize: 11, fontWeight: "600" },
  pickupHeading: { marginTop: 16 },
  pickupButton: { borderWidth: 1, borderColor: "#932D2C", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minWidth: 99, alignItems: "center" },
  pickupButtonText: { color: "#932D2C", fontSize: 11, fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(36,33,29,0.4)" },
  assignModal: { maxHeight: "75%", backgroundColor: "#FFFBF7", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#24211D", fontSize: 18, fontWeight: "700" },
  modalSubtitle: { color: "#8F8982", fontSize: 11, marginTop: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#F0EDE7", alignItems: "center", justifyContent: "center" },
  staffList: { flexGrow: 0 },
  noStaff: { color: "#716A62", fontSize: 13, lineHeight: 20, paddingVertical: 12 },
  staffRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, marginBottom: 9 },
  staffAvatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#F9EBEA", alignItems: "center", justifyContent: "center", marginRight: 10 },
  staffCopy: { flex: 1 },
  staffName: { color: "#24211D", fontSize: 13, fontWeight: "700" },
  staffEmail: { color: "#8F8982", fontSize: 10, marginTop: 3 },
});

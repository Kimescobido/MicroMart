import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { useAuth } from "../../src/context/AuthContext";
import { useCart } from "../../src/context/CartContext";
import { VoltageCompatibilityNotice } from "../../src/components/VoltageCompatibilityNotice";
import { getCustomerProfile, CustomerAddress } from "../../src/services/customerProfileService";
import { createCustomerOrder, FulfillmentType, OrderCheckoutError, PaymentMethod, PICKUP_POINT_LABEL } from "../../src/services/orderService";

const EMPTY_ADDRESS: CustomerAddress = {
  recipientName: "",
  phoneNumber: "",
  streetAddress: "",
  barangay: "",
  city: "Iligan City",
  province: "Lanao del Norte",
  postalCode: "",
  landmark: "",
};

const METHODS: {
  id: PaymentMethod;
  title: string;
  subtitle: string;
  icon: "bicycle-outline" | "storefront-outline" | "card-outline";
}[] = [
  {
    id: "COD",
    title: "Cash on Delivery",
    subtitle: "Pay in cash when your order arrives.",
    icon: "bicycle-outline",
  },
  {
    id: "COP",
    title: "Cash on Pickup",
    subtitle: "Pay in cash when you collect your order.",
    icon: "storefront-outline",
  },
  {
    id: "PAYPAL",
    title: "PayPal Sandbox",
    subtitle: "Pay online after the shop confirms your order.",
    icon: "card-outline",
  },
];

const FULFILLMENT_OPTIONS: { id: FulfillmentType; title: string; subtitle: string; icon: "bicycle-outline" | "storefront-outline" }[] = [
  { id: "delivery", title: "Delivery", subtitle: "Bring it to my saved address", icon: "bicycle-outline" },
  { id: "pickup", title: "Store pickup", subtitle: `Collect at ${PICKUP_POINT_LABEL}`, icon: "storefront-outline" },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, cartTotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState<CustomerAddress | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const loadProfile = async () => {
      if (!user?.uid) {
        setIsLoadingProfile(false);
        return;
      }
      try {
        const profile = await getCustomerProfile(user.uid);
        if (!isCurrent) return;
        const address = profile?.deliveryAddress ?? null;
        setDeliveryAddress(address);
        setCustomerName(profile?.fullName || address?.recipientName || user.displayName || "");
      } catch (error) {
        console.error("Could not load checkout contact details", error);
      } finally {
        if (isCurrent) setIsLoadingProfile(false);
      }
    };
    void loadProfile();
    return () => { isCurrent = false; };
  }, [user?.uid, user?.displayName]);

  const placeOrder = async () => {
    if (cart.length === 0) {
      Alert.alert("Your cart is empty", "Add an item before checking out.");
      router.replace("/(customer)/shop");
      return;
    }
    if (!user?.uid) {
      Alert.alert("Sign in required", "Sign in to place your order.");
      return;
    }
    const contact = deliveryAddress ?? EMPTY_ADDRESS;
    if (!contact.recipientName.trim() || !contact.phoneNumber.trim() ||
        (fulfillmentType === "delivery" && (!contact.streetAddress.trim() || !contact.barangay.trim()))) {
      Alert.alert(
        "Add your delivery details",
        fulfillmentType === "delivery"
          ? "Save a recipient name, phone, barangay, and street address before ordering delivery."
          : "Save a recipient name and phone number in your profile before placing a pickup order.",
        [
          { text: "Later", style: "cancel" },
          { text: "Edit profile", onPress: () => router.push("/(customer)/profile") },
        ],
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const orderId = await createCustomerOrder({
        customer: {
          uid: user.uid,
          name: contact.recipientName || customerName,
          email: user.email ?? "",
          phone: contact.phoneNumber,
        },
        cart,
        paymentMethod,
        fulfillmentType,
        deliveryAddress: contact,
      });
      clearCart();
      const status = "to-pay";
      const nextStep = paymentMethod === "PAYPAL"
        ? "Once the shop confirms stock, PayPal payment will be available in To Pay."
        : "Inventory changes after confirmation.";
      Alert.alert(
        "Order request sent",
        `Request ${orderId.slice(0, 8).toUpperCase()} is waiting for the shop to confirm stock. ${nextStep}`,
        [{ text: "View order", onPress: () => router.replace({ pathname: "/(customer)/purchases", params: { status } }) }],
      );
    } catch (error) {
      const message = error instanceof OrderCheckoutError || error instanceof Error
        ? error.message
        : "Please check your connection and try again.";
      Alert.alert("Order not placed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to cart"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#24211D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Payment method</Text>
        <Text style={styles.sectionDescription}>
          Choose how you want to pay for this order.
        </Text>

        {METHODS.map((method) => {
          const selected = paymentMethod === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.methodCard, selected && styles.methodCardSelected]}
              onPress={() => {
                setPaymentMethod(method.id);
                if (method.id === "COD") setFulfillmentType("delivery");
                if (method.id === "COP") setFulfillmentType("pickup");
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.methodIcon, selected && styles.methodIconSelected]}>
                <Ionicons name={method.icon} size={21} color={selected ? "#932D2C" : "#24211D"} />
              </View>
              <View style={styles.methodCopy}>
                <Text style={styles.methodTitle}>{method.title}</Text>
                <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
              </View>
              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {paymentMethod === "PAYPAL" && (
          <>
            <Text style={styles.fulfillmentHeading}>How would you like to receive it?</Text>
            {FULFILLMENT_OPTIONS.map((option) => {
              const selected = fulfillmentType === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={[styles.fulfillmentCard, selected && styles.methodCardSelected]}
                  onPress={() => setFulfillmentType(option.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.methodIcon, selected && styles.methodIconSelected]}>
                    <Ionicons name={option.icon} size={20} color={selected ? "#932D2C" : "#24211D"} />
                  </View>
                  <View style={styles.methodCopy}>
                    <Text style={styles.methodTitle}>{option.title}</Text>
                    <Text style={styles.methodSubtitle}>{option.subtitle}</Text>
                  </View>
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <View style={styles.addressHeading}>
              <Ionicons name={fulfillmentType === "delivery" ? "location-outline" : "person-outline"} size={18} color="#932D2C" />
              <Text style={styles.addressTitle}>{fulfillmentType === "delivery" ? "Delivery address" : "Pickup contact"}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(customer)/profile")}>
              <Text style={styles.editAddressText}>{deliveryAddress ? "Edit" : "Add"}</Text>
            </TouchableOpacity>
          </View>
          {isLoadingProfile ? (
            <ActivityIndicator size="small" color="#932D2C" style={{ alignSelf: "flex-start" }} />
          ) : deliveryAddress?.recipientName && deliveryAddress.phoneNumber ? (
            <>
              <Text style={styles.addressName}>{deliveryAddress.recipientName} · {deliveryAddress.phoneNumber}</Text>
              {fulfillmentType === "delivery" ? (
                <Text style={styles.addressText}>
                  {[deliveryAddress.streetAddress, deliveryAddress.barangay, deliveryAddress.city, deliveryAddress.province]
                    .filter(Boolean).join(", ")}
                  {deliveryAddress.landmark ? `\n${deliveryAddress.landmark}` : ""}
                </Text>
              ) : (
                <Text style={styles.addressText}>Pickup at {PICKUP_POINT_LABEL}</Text>
              )}
            </>
          ) : (
            <Text style={styles.addressMissing}>Add your name and phone number in Profile to continue.</Text>
          )}
        </View>

        <VoltageCompatibilityNotice items={cart} />

        <Text style={[styles.sectionTitle, styles.orderTitle]}>Order summary</Text>
        <View style={styles.summaryCard}>
          {cart.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name} <Text style={styles.quantity}>× {item.quantity}</Text>
              </Text>
              <Text style={styles.itemTotal}>
                ₱{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{cartTotal.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total to pay</Text>
          <Text style={styles.footerTotal}>₱{cartTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, cart.length === 0 && styles.disabledButton]}
          onPress={placeOrder}
          disabled={cart.length === 0 || isSubmitting || isLoadingProfile}
        >
          {isSubmitting ? <ActivityIndicator color="#FFFBF7" /> : <>
            <Text style={styles.placeOrderText}>Place Order</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFBF7" />
          </>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBF7" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#24211D", fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 38 },
  content: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 24 },
  sectionTitle: { color: "#24211D", fontSize: 19, fontWeight: "700" },
  sectionDescription: { color: "#8F8982", fontSize: 13, marginTop: 5, marginBottom: 15 },
  methodCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 11,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDEDED",
  },
  methodCardSelected: { borderColor: "#932D2C", backgroundColor: "#FFF9F7" },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F5F2EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  methodIconSelected: { backgroundColor: "#F9EBEA" },
  methodCopy: { flex: 1 },
  methodTitle: { color: "#24211D", fontSize: 14, fontWeight: "700" },
  methodSubtitle: { color: "#8F8982", fontSize: 11, marginTop: 4 },
  fulfillmentHeading: { color: "#24211D", fontSize: 15, fontWeight: "700", marginTop: 8, marginBottom: 10 },
  fulfillmentCard: { minHeight: 72, flexDirection: "row", alignItems: "center", padding: 11, marginBottom: 9, backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#EDEDED" },
  addressCard: { backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#EDEDED", padding: 14, marginTop: 3 },
  addressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  addressHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  addressTitle: { color: "#24211D", fontSize: 13, fontWeight: "700" },
  editAddressText: { color: "#932D2C", fontSize: 12, fontWeight: "700" },
  addressName: { color: "#24211D", fontSize: 12, fontWeight: "600", marginBottom: 4 },
  addressText: { color: "#6E675F", fontSize: 11, lineHeight: 16 },
  addressMissing: { color: "#8F8982", fontSize: 12, lineHeight: 17 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#C8C2BC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  radioOuterSelected: { borderColor: "#932D2C" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#932D2C" },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9EBEA",
    borderRadius: 13,
    padding: 12,
    marginTop: 4,
  },
  warningText: { flex: 1, color: "#78281F", fontSize: 12, marginLeft: 9, lineHeight: 17 },
  orderTitle: { marginTop: 25, marginBottom: 12 },
  summaryCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16 },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 },
  itemName: { flex: 1, color: "#4B4640", fontSize: 13, marginRight: 12 },
  quantity: { color: "#9A948D" },
  itemTotal: { color: "#24211D", fontSize: 13, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#EDEDED", marginBottom: 13 },
  totalLabel: { color: "#24211D", fontSize: 14, fontWeight: "600" },
  totalValue: { color: "#932D2C", fontSize: 17, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
  },
  footerLabel: { color: "#8F8982", fontSize: 11 },
  footerTotal: { color: "#24211D", fontSize: 19, fontWeight: "700", marginTop: 2 },
  placeOrderButton: {
    backgroundColor: "#932D2C",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  disabledButton: { opacity: 0.5 },
  placeOrderText: { color: "#FFFBF7", fontSize: 14, fontWeight: "700" },
});

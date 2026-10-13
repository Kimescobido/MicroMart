import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { logoutUser } from "../../src/services/authService";
import {
  CustomerAddress,
  getCustomerProfile,
  saveCustomerAddress,
} from "../../src/services/customerProfileService";
import { watchCustomerOrderCounts } from "../../src/services/orderService";

const DELIVERY_CITY = "Iligan City";
const DELIVERY_PROVINCE = "Lanao del Norte";

const EMPTY_ADDRESS: CustomerAddress = {
  recipientName: "",
  phoneNumber: "",
  streetAddress: "",
  barangay: "",
  city: DELIVERY_CITY,
  province: DELIVERY_PROVINCE,
  postalCode: "",
  landmark: "",
};

const ORDER_STATUSES = [
  { label: "To Pay", key: "to_pay" as const, icon: "wallet-outline" as const },
  { label: "To Ship", key: "to_ship" as const, icon: "cube-outline" as const },
  { label: "To Receive", key: "to_receive" as const, icon: "bicycle-outline" as const },
  { label: "COP Orders", key: "cop" as const, icon: "storefront-outline" as const },
  { label: "Completed", key: "completed" as const, icon: "checkmark-circle-outline" as const },
];

const ADDRESS_FIELDS: { key: keyof CustomerAddress; label: string; placeholder: string }[] = [
  { key: "recipientName", label: "Recipient name", placeholder: "Name of person receiving the order" },
  { key: "phoneNumber", label: "Phone number", placeholder: "09xx xxx xxxx" },
  { key: "barangay", label: "Barangay", placeholder: "Barangay" },
  { key: "streetAddress", label: "House / street / building", placeholder: "House number, street, subdivision" },
  { key: "landmark", label: "Landmark or delivery notes", placeholder: "Nearby landmark, gate, or instructions" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [address, setAddress] = useState<CustomerAddress | null>(null);
  const [profileName, setProfileName] = useState("");
  const [draftAddress, setDraftAddress] = useState<CustomerAddress>(EMPTY_ADDRESS);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [orderCounts, setOrderCounts] = useState({ to_pay: 0, to_ship: 0, to_receive: 0, cop: 0, completed: 0 });

  useEffect(() => {
    if (!user?.uid) {
      setOrderCounts({ to_pay: 0, to_ship: 0, to_receive: 0, cop: 0, completed: 0 });
      return;
    }
    return watchCustomerOrderCounts(user.uid, setOrderCounts, (error) => {
      console.error("Could not load profile order counts", error);
    });
  }, [user?.uid]);

  useEffect(() => {
    let isCurrent = true;
    const loadAddress = async () => {
      if (!user?.uid) {
        setAddress(null);
        setProfileName("");
        setIsLoadingAddress(false);
        return;
      }

      setIsLoadingAddress(true);
      try {
        const profile = await getCustomerProfile(user.uid);
        if (isCurrent) {
          setAddress(profile?.deliveryAddress ? {
            ...EMPTY_ADDRESS,
            ...profile.deliveryAddress,
            city: DELIVERY_CITY,
            province: DELIVERY_PROVINCE,
            postalCode: "",
          } : null);
          setProfileName(profile?.fullName ?? "");
        }
      } catch (error) {
        console.error("Could not load customer delivery address", error);
      } finally {
        if (isCurrent) setIsLoadingAddress(false);
      }
    };

    void loadAddress();
    return () => {
      isCurrent = false;
    };
  }, [user?.uid]);

  const openAddressEditor = () => {
    setDraftAddress(address ?? {
      ...EMPTY_ADDRESS,
      recipientName: profileName || user?.displayName || "",
    });
    setAddressModalVisible(true);
  };

  const saveAddress = async () => {
    if (!user?.uid) {
      Alert.alert("Sign in required", "Please sign in before saving a delivery address.");
      return;
    }

    if (!draftAddress.recipientName.trim() || !draftAddress.phoneNumber.trim() ||
        !draftAddress.streetAddress.trim() || !draftAddress.barangay.trim()) {
      Alert.alert("Complete your address", "Add the recipient, phone number, barangay, and house or street details.");
      return;
    }

    const normalizedAddress = Object.fromEntries(
      Object.entries(draftAddress).map(([key, value]) => [key, value.trim()]),
    ) as CustomerAddress;
    normalizedAddress.city = DELIVERY_CITY;
    normalizedAddress.province = DELIVERY_PROVINCE;
    normalizedAddress.postalCode = "";

    setIsSavingAddress(true);
    try {
      await saveCustomerAddress(user.uid, normalizedAddress);
      setAddress(normalizedAddress);
      setAddressModalVisible(false);
      Alert.alert("Address saved", "Your delivery location is ready to use at checkout.");
    } catch (error) {
      console.error("Could not save customer delivery address", error);
      Alert.alert("Couldn't save address", "Please check your connection and try again.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
      router.replace("/(auth)");
    } catch (error) {
      console.error("Could not sign out", error);
      Alert.alert("Couldn't log out", "Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };
  const openPurchases = (status?: string) => {
    router.push({ pathname: "/(customer)/purchases", params: status ? { status } : {} });
  };

  const addressLines = address
    ? [address.streetAddress, address.barangay, [address.city, address.province, address.postalCode].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join("\n")
    : "Add an address so your delivery person knows where to bring your order.";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
            <Text style={styles.headerTitle}>My Profile</Text>
          </View>
          <TouchableOpacity
            style={styles.headerIcon}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => Alert.alert("Notifications", "You’re all caught up.")}
          >
            <Ionicons name="notifications-outline" size={21} color="#24211D" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{(user?.displayName || user?.email || "C").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
          <Text style={styles.userName} numberOfLines={1}>{profileName || user?.displayName || "Customer"}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email || "Signed in customer"}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Edit delivery details"
            style={styles.editProfileButton}
            onPress={openAddressEditor}
          >
            <Ionicons name="create-outline" size={20} color="#932D2C" />
          </TouchableOpacity>
        </View>

        <View style={styles.ordersCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Purchases</Text>
            <TouchableOpacity onPress={() => openPurchases()}>
              <Text style={styles.viewAll}>View all <Ionicons name="chevron-forward" size={12} color="#932D2C" /></Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statusRow}>
            {ORDER_STATUSES.map((status) => (
              <TouchableOpacity
                key={status.label}
                style={styles.statusItem}
                accessibilityRole="button"
                accessibilityLabel={`${status.label}, ${orderCounts[status.key]} orders`}
                onPress={() => openPurchases(status.label === "COP Orders" ? "cop" : status.label.toLowerCase().replace(/ /g, "-"))}
              >
                <View style={styles.statusIconWrap}>
                  <Ionicons name={status.icon} size={22} color="#932D2C" />
                  {orderCounts[status.key] > 0 && <View style={styles.countBadge}><Text style={styles.countText}>{orderCounts[status.key] > 99 ? "99+" : orderCounts[status.key]}</Text></View>}
                </View>
                <Text style={styles.statusLabel}>{status.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeaderAddress}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TouchableOpacity onPress={openAddressEditor} style={styles.addAddressButton}>
            <Ionicons name={address ? "create-outline" : "add"} size={16} color="#932D2C" />
            <Text style={styles.addAddressText}>{address ? "Edit" : "Add address"}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addressCard} onPress={openAddressEditor} activeOpacity={0.85}>
          <View style={styles.addressIcon}>
            <Ionicons name="location-outline" size={21} color="#932D2C" />
          </View>
          <View style={styles.addressCopy}>
            <View style={styles.addressNameRow}>
              <Text style={styles.addressName} numberOfLines={1}>{address?.recipientName || "Delivery location"}</Text>
              {address?.phoneNumber ? <Text style={styles.addressPhone}>{address.phoneNumber}</Text> : null}
            </View>
            {isLoadingAddress ? (
              <ActivityIndicator size="small" color="#932D2C" style={styles.addressLoader} />
            ) : (
              <Text style={[styles.addressText, !address && styles.addressPlaceholder]}>{addressLines}</Text>
            )}
            {address?.landmark ? <Text style={styles.landmarkText}>Note: {address.landmark}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A09F9B" />
        </TouchableOpacity>

        <Text style={styles.preferencesTitle}>Settings</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("Voltage checker", "Compatibility checks are active for 3.3V and 5V items.")}>
          <View style={styles.menuIconContainer}><Ionicons name="flash-outline" size={20} color="#24211D" /></View>
          <Text style={styles.menuText}>Voltage Checker</Text>
          <Text style={styles.menuMeta}>Active</Text>
          <Ionicons name="chevron-forward" size={18} color="#A09F9B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutMenuItem]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <View style={styles.menuIconContainer}><Ionicons name="log-out-outline" size={20} color="#932D2C" /></View>
          {isLoggingOut ? <ActivityIndicator size="small" color="#932D2C" /> : <Text style={[styles.menuText, styles.logoutText]}>Log Out</Text>}
          {!isLoggingOut ? <Ionicons name="chevron-forward" size={18} color="#A09F9B" /> : null}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={addressModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.addressModal}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Delivery address</Text>
        <Text style={styles.modalSubtitle}>Deliveries are available in Iligan City, Lanao del Norte.</Text>
              </View>
              <TouchableOpacity style={styles.modalClose} onPress={() => setAddressModalVisible(false)}>
                <Ionicons name="close" size={20} color="#24211D" />
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formContent}
            >
              {ADDRESS_FIELDS.map((field) => (
                <View key={field.key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{field.label}</Text>
                  <TextInput
                    value={draftAddress[field.key]}
                    onChangeText={(value) => setDraftAddress((current) => ({ ...current, [field.key]: value }))}
                    placeholder={field.placeholder}
                    placeholderTextColor="#AAA39B"
                    style={[styles.addressInput, field.key === "landmark" && styles.landmarkInput]}
                    multiline={field.key === "landmark"}
                    textAlignVertical={field.key === "landmark" ? "top" : "center"}
                    keyboardType={field.key === "phoneNumber" || field.key === "postalCode" ? "phone-pad" : "default"}
                    autoCapitalize={field.key === "phoneNumber" || field.key === "postalCode" ? "none" : "words"}
                  />
                </View>
              ))}
              <View style={styles.serviceArea}>
                <Ionicons name="location" size={17} color="#932D2C" />
                <Text style={styles.serviceAreaText}>{DELIVERY_CITY}, {DELIVERY_PROVINCE}</Text>
                <Text style={styles.fixedLabel}>Fixed area</Text>
              </View>
            </ScrollView>
            <TouchableOpacity style={[styles.saveButton, isSavingAddress && styles.savingButton]} onPress={saveAddress} disabled={isSavingAddress}>
              {isSavingAddress ? <ActivityIndicator color="#FFFBF7" /> : <Text style={styles.saveButtonText}>Save address</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBF7" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 9, paddingBottom: 17 },
  eyebrow: { color: "#9A948D", fontSize: 10, letterSpacing: 1.3, fontWeight: "700", marginBottom: 4 },
  headerTitle: { color: "#24211D", fontSize: 25, fontWeight: "700", fontFamily: "serif" },
  headerIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#F0EDE7" },
  profileCard: { flexDirection: "row", alignItems: "center", padding: 15, backgroundColor: "#FFFFFF", borderRadius: 19, borderWidth: 1, borderColor: "#EEEAE4", marginBottom: 17 },
  avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#F3E6DF", alignItems: "center", justifyContent: "center", marginRight: 13 },
  avatarInitial: { color: "#932D2C", fontSize: 23, fontWeight: "700" },
  profileInfo: { flex: 1 },
  userName: { color: "#24211D", fontSize: 16, fontWeight: "700", marginBottom: 4 },
  userEmail: { color: "#8F8982", fontSize: 12 },
  editProfileButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFF5F2", alignItems: "center", justifyContent: "center" },
  ordersCard: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#EEEAE4", paddingTop: 15, paddingBottom: 14, marginBottom: 21 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 15, marginBottom: 16 },
  sectionTitle: { color: "#24211D", fontSize: 16, fontWeight: "700" },
  viewAll: { color: "#932D2C", fontSize: 11, fontWeight: "600" },
  statusRow: { flexDirection: "row", justifyContent: "space-around" },
  statusItem: { width: "20%", alignItems: "center", paddingHorizontal: 2 },
  statusIconWrap: { width: 34, height: 32, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  countBadge: { position: "absolute", right: -4, top: -3, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#932D2C", borderWidth: 1.5, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  countText: { color: "#FFFFFF", fontSize: 8, fontWeight: "700" },
  statusLabel: { color: "#57514B", fontSize: 9, textAlign: "center", fontWeight: "500" },
  sectionHeaderAddress: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  addAddressButton: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 5, paddingLeft: 8 },
  addAddressText: { color: "#932D2C", fontSize: 12, fontWeight: "600" },
  addressCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#EEEAE4", padding: 14, marginBottom: 22 },
  addressIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFF3EF", alignItems: "center", justifyContent: "center", marginRight: 10 },
  addressCopy: { flex: 1, paddingTop: 1, marginRight: 8 },
  addressNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 5 },
  addressName: { color: "#24211D", fontSize: 13, fontWeight: "700", marginRight: 8 },
  addressPhone: { color: "#8F8982", fontSize: 11 },
  addressText: { color: "#655E57", fontSize: 12, lineHeight: 18 },
  addressPlaceholder: { color: "#8F8982" },
  addressLoader: { alignSelf: "flex-start", marginVertical: 6 },
  landmarkText: { color: "#8F8982", fontSize: 11, lineHeight: 16, marginTop: 5 },
  preferencesTitle: { color: "#24211D", fontSize: 16, fontWeight: "700", marginBottom: 11 },
  menuItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 12, borderRadius: 16, marginBottom: 9, borderWidth: 1, borderColor: "#EEEAE4" },
  menuIconContainer: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#F7F4F0", justifyContent: "center", alignItems: "center", marginRight: 11 },
  menuText: { flex: 1, color: "#24211D", fontSize: 13, fontWeight: "600" },
  menuMeta: { color: "#8F8982", fontSize: 11, marginRight: 8 },
  logoutMenuItem: { marginTop: 1 },
  logoutText: { color: "#932D2C" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(36, 33, 29, 0.38)" },
  addressModal: { maxHeight: "92%", backgroundColor: "#FFFBF7", borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 28 : 18 },
  modalHandle: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: "#D8D2CB", marginBottom: 17 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#24211D", fontSize: 19, fontWeight: "700" },
  modalSubtitle: { color: "#8F8982", fontSize: 12, marginTop: 4 },
  modalClose: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#F0EDE7", alignItems: "center", justifyContent: "center" },
  formContent: { paddingBottom: 12 },
  inputGroup: { marginBottom: 11 },
  inputLabel: { color: "#514B45", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  addressInput: { minHeight: 46, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8E3DC", borderRadius: 12, paddingHorizontal: 12, color: "#24211D", fontSize: 13 },
  serviceArea: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9EBEA", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12 },
  serviceAreaText: { flex: 1, color: "#514B45", fontSize: 12, fontWeight: "600", marginLeft: 8 },
  fixedLabel: { color: "#932D2C", fontSize: 10, fontWeight: "700" },
  landmarkInput: { minHeight: 74, paddingTop: 12 },
  saveButton: { height: 49, borderRadius: 15, backgroundColor: "#932D2C", alignItems: "center", justifyContent: "center", marginTop: 6 },
  savingButton: { opacity: 0.75 },
  saveButtonText: { color: "#FFFBF7", fontSize: 14, fontWeight: "700" },
});

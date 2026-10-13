import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import {
  getVoltageCompatibilitySummary,
} from "../services/compatibilityService";
import type { VoltageCompatibilityItem } from "../services/compatibilityService";

export function VoltageCompatibilityNotice({
  items,
  style,
}: {
  items: VoltageCompatibilityItem[];
  style?: StyleProp<ViewStyle>;
}) {
  const summary = getVoltageCompatibilitySummary(items);
  if (summary.itemCount < 2) return null;

  const title = summary.hasDifferentVoltages
    ? "Different voltage ratings"
    : summary.needsReview
      ? "Some voltage ratings need checking"
      : "Voltage ratings match";
  const message = summary.hasDifferentVoltages
    ? "Confirm your controller and power supply support these ratings. Use a level shifter when signal logic levels differ."
    : summary.needsReview
      ? "Some products do not list a specific voltage. Check their specifications before connecting them."
      : "The listed ratings match, but this alone does not confirm full compatibility.";

  return (
    <View
      style={[styles.card, summary.needsReview ? styles.reviewCard : styles.matchCard, style]}
      accessibilityRole="summary"
    >
      <View style={styles.heading}>
        <Ionicons
          name={summary.needsReview ? "warning-outline" : "checkmark-circle-outline"}
          size={19}
          color={summary.needsReview ? "#A85D28" : "#347348"}
        />
        <Text style={[styles.title, summary.needsReview ? styles.reviewTitle : styles.matchTitle]}>{title}</Text>
      </View>

      {summary.voltageGroups.map((group) => (
        <Text key={group.voltage} style={styles.groupLine}>
          <Text style={styles.groupVoltage}>{group.voltage}: </Text>
          {group.itemNames.slice(0, 3).join(", ")}
          {group.itemNames.length > 3 ? ` +${group.itemNames.length - 3} more` : ""}
        </Text>
      ))}
      {summary.unspecifiedItems.length > 0 ? (
        <Text style={styles.groupLine}>
          <Text style={styles.groupVoltage}>Check voltage: </Text>
          {summary.unspecifiedItems.slice(0, 3).join(", ")}
          {summary.unspecifiedItems.length > 3 ? ` +${summary.unspecifiedItems.length - 3} more` : ""}
        </Text>
      ) : null}

      <Text style={styles.message}>{message}</Text>
      <Text style={styles.disclaimer}>This checks voltage labels only. Also verify board support, pinout, interface, and current requirements.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 },
  reviewCard: { backgroundColor: "#FFF7EA", borderColor: "#F0D9B7" },
  matchCard: { backgroundColor: "#F0F7F0", borderColor: "#D8E8D9" },
  heading: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 7 },
  title: { fontSize: 12, fontWeight: "700" },
  reviewTitle: { color: "#8F4E22" },
  matchTitle: { color: "#347348" },
  groupLine: { color: "#514B45", fontSize: 11, lineHeight: 16, marginTop: 2 },
  groupVoltage: { color: "#24211D", fontWeight: "700" },
  message: { color: "#514B45", fontSize: 11, lineHeight: 16, marginTop: 8 },
  disclaimer: { color: "#82796F", fontSize: 10, lineHeight: 14, marginTop: 5 },
});

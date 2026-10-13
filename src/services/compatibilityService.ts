export interface VoltageCompatibilityItem {
  name: string;
  voltage?: string | null;
}

export interface VoltageGroup {
  voltage: string;
  itemNames: string[];
}

export interface VoltageCompatibilitySummary {
  itemCount: number;
  voltageGroups: VoltageGroup[];
  unspecifiedItems: string[];
  hasDifferentVoltages: boolean;
  needsReview: boolean;
}

export const getVoltageCompatibilitySummary = (
  items: VoltageCompatibilityItem[],
): VoltageCompatibilitySummary => {
  const groupedItems = new Map<string, string[]>();
  const unspecifiedItems: string[] = [];

  items.forEach((item) => {
    const voltage = item.voltage?.trim().replace(/\s+/g, "").toUpperCase();
    if (!voltage || voltage === "ANY" || voltage === "N/A") {
      unspecifiedItems.push(item.name);
      return;
    }

    const names = groupedItems.get(voltage) ?? [];
    names.push(item.name);
    groupedItems.set(voltage, names);
  });

  const voltageGroups = Array.from(groupedItems, ([voltage, itemNames]) => ({ voltage, itemNames }))
    .sort((a, b) => {
      const aValue = Number.parseFloat(a.voltage);
      const bValue = Number.parseFloat(b.voltage);
      if (Number.isFinite(aValue) && Number.isFinite(bValue)) return aValue - bValue;
      return a.voltage.localeCompare(b.voltage);
    });
  const hasDifferentVoltages = voltageGroups.length > 1;

  return {
    itemCount: items.length,
    voltageGroups,
    unspecifiedItems,
    hasDifferentVoltages,
    needsReview: hasDifferentVoltages || unspecifiedItems.length > 0,
  };
};

import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { loadSensitivity, saveSensitivity } from "../lib/store";
import type { Sensitivity } from "../lib/types";

export default function Settings() {
  const [sensitivity, setSensitivity] = useState<Sensitivity>("Balanced");

  useEffect(() => {
    loadSensitivity().then(setSensitivity);
  }, []);

  const setAndSave = async (s: Sensitivity) => {
    setSensitivity(s);
    await saveSensitivity(s);
  };

  const Option = ({ label }: { label: Sensitivity }) => {
    const active = sensitivity === label;
    return (
      <Pressable
        onPress={() => setAndSave(label)}
        style={[
          styles.option,
          active && styles.optionActive,
        ]}
      >
        <Text
          style={[
            styles.optionText,
            active && styles.optionTextActive,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Settings</Text>

      {/* Sensitivity card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detection Sensitivity</Text>
        <Text style={styles.cardSubtitle}>
          Controls how quickly alerts are triggered
        </Text>

        <View style={styles.row}>
          <Option label="Conservative" />
          <Option label="Balanced" />
          <Option label="Aggressive" />
        </View>

        <Text style={styles.current}>
          Current: <Text style={styles.currentValue}>{sensitivity}</Text>
        </Text>
      </View>

      {/* BLE test card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wristband Test</Text>
        <Text style={styles.cardSubtitle}>
          Send a test vibration to the wristband
        </Text>

        <Pressable
          style={styles.testButton}
          onPress={() => alert("TODO: send BLE command")}
        >
          <Text style={styles.testButtonText}>Test Vibration</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: "#cfe6ff",
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
    marginBottom: 4,
  },

  cardSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  option: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.20)",
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
  },

  optionActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },

  optionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
  },

  optionTextActive: {
    color: "#fff",
  },

  current: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.6)",
  },

  currentValue: {
    fontWeight: "900",
    color: "#111",
  },

  testButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#16a34a",
    alignItems: "center",
  },

  testButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#fff",
  },
});


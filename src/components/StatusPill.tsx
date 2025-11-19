import { View, Text } from "react-native";

export default function StatusPill({ state }: { state: "NORMAL" | "WARNING" | "ALERT" }) {
  const color =
    state === "NORMAL" ? "#16a34a" : state === "WARNING" ? "#f59e0b" : "#dc2626";
  return (
    <View style={{
      alignSelf: "center",
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 999, backgroundColor: color
    }}>
      <Text style={{ color: "white", fontWeight: "700" }}>{state}</Text>
    </View>
  );
}

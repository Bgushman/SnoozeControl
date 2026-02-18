import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNav";

type P = NativeStackScreenProps<RootStackParamList, "Home">;

export default function Home({ navigation }: P) {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Snooze Control</Text>
        <Text style={styles.subtitle}>Prototype</Text>

        <Pressable
          style={[styles.button, styles.primary]}
          onPress={() => navigation.navigate("Monitor")}
        >
          <Text style={styles.primaryText}>Start Monitoring</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate("Calibration")}
        >
          <Text style={styles.buttonText}>Calibration</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate("History")}
        >
          <Text style={styles.buttonText}>History</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate("Settings")}
        >
          <Text style={styles.buttonText}>Settings</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>
        This build uses a mock model.{" "}
        <Text
          style={styles.link}
          onPress={() =>
            Linking.openURL("https://example.com/cnn-docs")
          }
        >
          Replace later with real inference
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#cfe6ff",  // soft blue like calibration screen
    //backgroundColor: "#cfe6ff", 
    justifyContent: "center",
    padding: 20,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    color: "#111",
  },

  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    color: "rgba(0,0,0,0.55)",
    marginBottom: 10,
  },

  button: {
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1e90ff",
  },

  primary: {
    backgroundColor: "#1e90ff",
  },

  primaryText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  footer: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(0,0,0,0.55)",
  },

  link: {
    textDecorationLine: "underline",
    fontWeight: "800",
  },
});

}

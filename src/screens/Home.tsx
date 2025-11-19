import { View, Text, Button, Linking } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNav";

type P = NativeStackScreenProps<RootStackParamList, "Home">; 

export default function Home({ navigation }: P) {
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 16 }}> 
      <Text style={{ fontSize: 22, fontWeight: "700", textAlign: "center" }}>
        Snooze Control (Prototype)
      </Text>

      <Button title="Start Monitoring" onPress={() => navigation.navigate("Monitor")} />  
      <Button title="Calibration" onPress={() => navigation.navigate("Calibration")} /> 
      <Button title="History" onPress={() => navigation.navigate("History")} /> 
      <Button title="Settings" onPress={() => navigation.navigate("Settings")} /> 

      <Text style={{ textAlign: "center", color: "#666", marginTop: 16 }}>
        This build uses a mock model—{" "}
        <Text
          style={{ textDecorationLine: "underline" }}
          onPress={() => Linking.openURL("https://example.com/cnn-docs")} // Link to documentation
        >
          replace later with CNN inference
        </Text>
        .
      </Text>
    </View>
  );
}

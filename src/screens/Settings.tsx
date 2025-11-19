import { useEffect, useState } from "react";
import { View, Text, Button } from "react-native";
import { loadSensitivity, saveSensitivity } from "../lib/store";
import type { Sensitivity } from "../lib/types";

export default function Settings() { // Settings screen component
  const [sensitivity, setSensitivity] = useState<Sensitivity>("Balanced"); // State for detection sensitivity

  useEffect(() => { loadSensitivity().then(setSensitivity); }, []); // Load sensitivity on mount

  const setAndSave = async (s: Sensitivity) => { // Function to set and save sensitivity
    setSensitivity(s); // Update state
    await saveSensitivity(s); // Save to storage
  };

  return (
    <View style={{ flex:1, padding:20, gap:12 }}> 
      <Text style={{ fontSize:20, fontWeight:"700" }}>Settings</Text> 
      <Text>Detection Sensitivity</Text> 
      <View style={{ flexDirection:"row", gap:8 }}> 
        <Button title="Conservative" onPress={() => setAndSave("Conservative")} /> 
        <Button title="Balanced" onPress={() => setAndSave("Balanced")} /> 
        <Button title="Aggressive" onPress={() => setAndSave("Aggressive")} /> 
      </View>
      <Text style={{ color:"#444" }}>Current: {sensitivity}</Text> 
      <View style={{ height:12 }} />
      <Text style={{ fontWeight:"600" }}>Test Vibration (placeholder)</Text>
      <Button title="Test Buzz" onPress={() => alert("TODO: send BLE command")} />
    </View>
  );
}

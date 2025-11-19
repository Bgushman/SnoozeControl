import { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { loadSessions } from "../lib/store";
import { SessionSummary } from "../lib/types";

export default function History() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  useEffect(() => { loadSessions().then(setSessions); }, []);

  return (
    <View style={{ flex:1, padding:16 }}> 
      <Text style={{ fontSize:20, fontWeight:"700", marginBottom:12 }}>History</Text> 
      <FlatList //  List of past sessions
        data={sessions} // Data source
        keyExtractor={item => item.id} // Unique key for each item
        renderItem={({ item }) => ( // Render each session item
          <View style={{ padding:12, borderWidth:1, borderColor:"#ddd", borderRadius:8, marginBottom:8 }}> 
            <Text style={{ fontWeight:"600" }}> 
              {new Date(item.startedAt).toLocaleString()}
            </Text>
            <Text>Duration: {Math.round(item.durationSec/60)} min</Text> 
            <Text>Alerts: {item.alerts}</Text>
            <Text>Sensitivity: {item.sensitivity}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color:"#666" }}>No sessions yet.</Text>} // Empty list message
      />
    </View>
  );
}

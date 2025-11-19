import { useEffect, useRef, useState } from "react";
import { View, Text, Button } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { fsmNext, State } from "../lib/fsm";
import { loadThresholds, saveSession, loadSensitivity } from "../lib/store";
import { mockEar } from "../lib/inference.mock";
import { v4 as uuidv4 } from "uuid";
import StatusPill from "../components/StatusPill";

export default function Monitor() {
  const [perm, requestPerm] = useCameraPermissions(); // Camera permissions
  const [state, setState] = useState<State>("NORMAL"); // FSM state
  const [ear, setEar] = useState(0.28); // Current Eye Aspect Ratio
  const [threshold, setThreshold] = useState(0.20); // EAR threshold
  const [alerts, setAlerts] = useState(0); // Number of alerts triggered
  const [start, setStart] = useState<number | null>(null); // Session start time

  const belowCount = useRef(0); // Consecutive readings below threshold
  const aboveCount = useRef(0); // Consecutive readings above threshold
  const tick = useRef<NodeJS.Timeout | null>(null); // Interval for main loop

  useEffect(() => { // Main monitoring loop
    (async () => { // IIFE for async
      if (!perm?.granted) await requestPerm(); // Request permission if not granted
      const t = await loadThresholds(); // Load saved thresholds
      if (t) setThreshold(t.earThreshold); // Set EAR threshold
      setStart(Date.now()); // Set session start time
      tick.current = setInterval(() => { // Main loop interval
        const e = mockEar(); // TODO: replace with real CNN EAR/drowsy score !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        setEar(e);
        const res = fsmNext(state, e, threshold, belowCount.current, aboveCount.current); // FSM transition
        if (e < threshold) { belowCount.current += 1; aboveCount.current = 0; } // Reset aboveCount if below threshold
        else { aboveCount.current += 1; belowCount.current = 0; } // Reset belowCount if above threshold
        if (res.state !== state) { // State changed
          setState(res.state); // Update state
          if (res.state === "ALERT") { 
            // TODO: write BLE vibrate command here !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            setAlerts(a => a + 1);
          }
        }
      }, 100); // ~10Hz loop (FSM / HUD)
    })();
    return () => { if (tick.current) clearInterval(tick.current); };
  }, []);

  const stopAndSave = async () => {
    if (!start) return;
    const durationSec = Math.round((Date.now() - start) / 1000);
    const sensitivity = await loadSensitivity();
    await saveSession({
      id: uuidv4(),
      startedAt: start,
      durationSec,
      alerts,
      sensitivity,
    });
    alert(`Saved session. Duration ${durationSec}s, alerts ${alerts}`);
  };

  if (!perm?.granted) {
    return (
      <View style={{ flex:1, justifyContent:"center", alignItems:"center", padding:20 }}>
        <Text style={{ textAlign:"center", marginBottom:12 }}>Camera permission is required.</Text>
        <Button title="Grant permission" onPress={requestPerm} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView style={{ flex: 1 }} facing="front" />
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: "rgba(0,0,0,0.6)", padding: 12, gap: 8
      }}>
        <StatusPill state={state} />
        <Text style={{ color: "white", textAlign: "center" }}>
          EAR: {ear.toFixed(3)}  •  Threshold: {threshold.toFixed(3)}
        </Text>
        <Text style={{ color: "white", textAlign: "center" }}>Alerts: {alerts}</Text>
        <Button title="Stop & Save" onPress={stopAndSave} />
      </View>
    </View>
  );
}

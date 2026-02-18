import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
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

  useEffect(() => {
    (async () => {
      if (!perm?.granted) await requestPerm();
      const t = await loadThresholds();
      if (t) setThreshold(t.earThreshold);
      setStart(Date.now());

      tick.current = setInterval(() => {
        const e = mockEar(); // TODO: replace with real CNN EAR/drowsy score
        setEar(e);

        const res = fsmNext(state, e, threshold, belowCount.current, aboveCount.current);

        if (e < threshold) {
          belowCount.current += 1;
          aboveCount.current = 0;
        } else {
          aboveCount.current += 1;
          belowCount.current = 0;
        }

        if (res.state !== state) {
          setState(res.state);
          if (res.state === "ALERT") {
            // TODO: BLE vibrate command here
            setAlerts(a => a + 1);
          }
        }
      }, 100);
    })();

    return () => {
      if (tick.current) clearInterval(tick.current);
    };
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
      <View style={styles.permWrap}>
        <Text style={styles.permText}>Camera permission is required.</Text>
        <Pressable style={styles.permBtn} onPress={requestPerm}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView style={{ flex: 1 }} facing="front" />

      {/* Top badge */}
      <View style={styles.topBadge}>
        <Text style={styles.topBadgeText}>Monitoring</Text>
      </View>

      {/* Bottom HUD card */}
      <View style={styles.hud}>
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <StatusPill state={state} />
        </View>

        <View style={styles.metricsCard}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>EAR</Text>
            <Text style={styles.metricValue}>{ear.toFixed(3)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Threshold</Text>
            <Text style={styles.metricValue}>{threshold.toFixed(3)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Alerts</Text>
            <Text style={styles.metricValue}>{alerts}</Text>
          </View>
        </View>

        <Pressable style={[styles.cta, styles.stop]} onPress={stopAndSave}>
          <Text style={styles.ctaText}>Stop & Save</Text>
        </Pressable>

        <Text style={styles.helper}>
          Note: Using mock EAR right now (swap in real inference later).
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBadge: {
    position: "absolute",
    top: 18,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  topBadgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.4,
  },

  hud: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: "rgba(0,0,0,0.60)",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  metricsCard: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  metricLabel: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "800",
    fontSize: 14,
  },
  metricValue: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  cta: {
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  stop: {
    backgroundColor: "#2ecc71", // green like your mock
  },
  ctaText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },

  helper: {
    marginTop: 10,
    textAlign: "center",
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
  },

  permWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#cfe6ff",
  },
  permText: {
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.7)",
  },
  permBtn: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#1e90ff",
    justifyContent: "center",
    alignItems: "center",
  },
  permBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
});


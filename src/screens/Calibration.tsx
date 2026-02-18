import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { saveThresholds } from "../lib/store";
import { mockEar } from "../lib/inference.mock";

type Step = 1 | 2;

export default function Calibration() {
  const [perm, requestPerm] = useCameraPermissions();
  const [step, setStep] = useState<Step>(1);
  const [openVals, setOpenVals] = useState<number[]>([]);
  const [closedVals, setClosedVals] = useState<number[]>([]);
  const [liveEar, setLiveEar] = useState<number>(0.28);
  const [isRecording, setIsRecording] = useState(false);

  const sampler = useRef<NodeJS.Timeout | null>(null);
  const ticker = useRef<NodeJS.Timeout | null>(null);

  // -----------------------------
  // Draggable panel setup
  // -----------------------------
  const translateY = useRef(new Animated.Value(0)).current;
  const startY = useRef(0);
  const maxDownRef = useRef(0);

  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,

      onPanResponderGrant: () => {
        translateY.stopAnimation((v: number) => {
          startY.current = v;
        });
      },

      onPanResponderMove: (_, g) => {
        const maxDown = maxDownRef.current;
        const next = clamp(startY.current + g.dy, 0, maxDown);
        translateY.setValue(next);
      },

      onPanResponderRelease: (_, g) => {
        const maxDown = maxDownRef.current;
        const end = clamp(startY.current + g.dy, 0, maxDown);
        const shouldClose = end > maxDown * 0.45 || g.vy > 0.8;

        Animated.spring(translateY, {
          toValue: shouldClose ? maxDown : 0,
          useNativeDriver: true,
          tension: 140,
          friction: 18,
        }).start(() => {
          startY.current = shouldClose ? maxDown : 0;
        });
      },
    })
  ).current;

  // -----------------------------
  // EAR ticker
  // -----------------------------
  useEffect(() => {
    ticker.current = setInterval(() => {
      setLiveEar(mockEar());
    }, 100);

    return () => {
      if (ticker.current) clearInterval(ticker.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (sampler.current) clearInterval(sampler.current);
      if (ticker.current) clearInterval(ticker.current);
    };
  }, []);

  const record = (setFn: (v: number[]) => void) => {
    if (sampler.current) clearInterval(sampler.current);
    setIsRecording(true);

    const arr: number[] = [];
    let count = 0;

    sampler.current = setInterval(() => {
      arr.push(liveEar);
      count++;

      if (count >= 50) {
        if (sampler.current) clearInterval(sampler.current);
        setFn(arr);
        setIsRecording(false);
      }
    }, 100);
  };

  const computeAndSave = async () => {
    const mean = (a: number[]) =>
      a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

    const earOpen = mean(openVals);
    const earClosed = mean(closedVals);
    const k = 0.25;
    const earThreshold = earClosed + k * (earOpen - earClosed);

    await saveThresholds({ earOpen, earClosed, earThreshold });

    alert(
      `Saved threshold: ${earThreshold.toFixed(3)}\n` +
        `Open avg: ${earOpen.toFixed(3)} • Closed avg: ${earClosed.toFixed(3)}`
    );
  };

  const avg = (a: number[]) =>
    a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

  if (!perm || !perm.granted) {
    return (
      <SafeAreaView style={styles.permWrap}>
        <View style={styles.permCard}>
          <Text style={styles.permTitle}>Camera access needed</Text>
          <Text style={styles.permText}>
            Calibration uses the front camera preview.
          </Text>
          <Pressable style={[styles.bigBtn, styles.blueBtn]} onPress={requestPerm}>
            <Text style={styles.bigBtnText}>Grant Camera Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const openAvg = openVals.length ? avg(openVals) : null;
  const closedAvg = closedVals.length ? avg(closedVals) : null;
  const threshold =
    openAvg != null && closedAvg != null
      ? closedAvg + 0.25 * (openAvg - closedAvg)
      : null;

  const canNext = !isRecording && openVals.length > 0;
  const canSave = !isRecording && openVals.length > 0 && closedVals.length > 0;

  return (
    <View style={styles.screen}>
      <CameraView style={styles.camera} facing="front" />

      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.stepText}>step {step} of 2</Text>
          <Text style={styles.instructionText}>
            {step === 1
              ? "open eyes and look straight"
              : "close eyes and hold still"}
          </Text>
        </View>
      </SafeAreaView>

      {/* Draggable Panel */}
      <Animated.View
        {...pan.panHandlers}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          const peek = 90;
          const screenH = Dimensions.get("window").height;
          const maxDown = Math.max(0, Math.min(h - peek, screenH * 0.75));
          maxDownRef.current = maxDown;
        }}
        style={[
          styles.bottomPanel,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandleWrap}>
          <View style={styles.dragHandle} />
        </View>

        <View style={styles.hudRow}>
          <Text style={styles.hudText}>Live EAR {liveEar.toFixed(3)}</Text>
        </View>

        <Pressable
          style={[styles.bigBtn, styles.blueBtn]}
          onPress={() =>
            step === 1 ? record(setOpenVals) : record(setClosedVals)
          }
          disabled={isRecording}
        >
          <Text style={styles.bigBtnText}>Start Recording</Text>
        </Pressable>

        <View style={styles.card}>
          <Row label="EAR Open" value={openAvg?.toFixed(2) ?? "--"} />
          <Row label="EAR Closed" value={closedAvg?.toFixed(2) ?? "--"} />
          <Row label="Threshold" value={threshold?.toFixed(2) ?? "--"} last />
        </View>

        {step === 1 ? (
          <Pressable
            style={[styles.bigBtn, styles.greenBtn]}
            onPress={() => setStep(2)}
            disabled={!canNext}
          >
            <Text style={styles.bigBtnText}>Save & Continue</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.bigBtn, styles.greenBtn]}
            onPress={computeAndSave}
            disabled={!canSave}
          >
            <Text style={styles.bigBtnText}>Save Threshold</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

function Row({ label, value, last }: any) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },

  headerSafe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    padding: 20,
    alignItems: "center",
  },
  stepText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  instructionText: { color: "#fff", fontSize: 22, fontWeight: "800" },

  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
    backgroundColor: "rgba(207,230,255,0.95)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  dragHandleWrap: { alignItems: "center", marginBottom: 10 },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  hudRow: { alignItems: "center", marginBottom: 10 },
  hudText: { fontSize: 16, fontWeight: "800", color: "#111" },

  bigBtn: {
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  bigBtnText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  blueBtn: { backgroundColor: "#2f80ff" },
  greenBtn: { backgroundColor: "#2bb24c" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 18, fontWeight: "800", color: "#111" },
  rowValue: { fontSize: 18, fontWeight: "800", color: "#111" },

  permWrap: { flex: 1, justifyContent: "center", padding: 18 },
  permCard: { backgroundColor: "#fff", padding: 20, borderRadius: 16 },
  permTitle: { fontSize: 20, fontWeight: "900", marginBottom: 8 },
  permText: { marginBottom: 14 },
});


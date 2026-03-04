import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { fsmNext, State } from "../lib/fsm";
import { loadThresholds, saveSession, loadSensitivity } from "../lib/store";
import { mockEar } from "../lib/inference.mock";
import StatusPill from "../components/StatusPill";

const API_URL = "http://172.31.181.137:8080/data";
const POLL_MS = 50;

type Telemetry = {
  timestamp?: number;
  is_drowsy?: boolean;
  stage?: number;
  ear?: number;
  mar?: number;
  drowsy_reason?: string[];
  blinks?: number;
  yawns?: number;
  head_pitch?: number;
  head_nods?: number;
};

async function fetchTelemetry(): Promise<Telemetry | null> {
  try {
    const res = await fetch(API_URL, { method: "GET" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || typeof json !== "object") return null;
    return json as Telemetry;
  } catch {
    return null;
  }
}

function mapStageToState(stage: number): State {
  if (stage === 2) return "ALERT";
  if (stage === 1) return "WARNING";
  return "NORMAL";
}

function MetricRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, mono && styles.mono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function AccordionItem({
  title,
  rightValue,
  children,
  defaultOpen = false,
}: {
  title: string;
  rightValue?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={styles.accordionItem}>
      <Pressable onPress={toggle} style={styles.accordionHeader}>
        <Text style={styles.accordionTitle}>{title}</Text>
        <View style={styles.accordionRight}>
          {rightValue != null ? (
            <Text style={styles.accordionRightText} numberOfLines={1}>
              {rightValue}
            </Text>
          ) : null}
          <Text style={styles.chev}>{open ? "▾" : "▸"}</Text>
        </View>
      </Pressable>

      {open ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

export default function Monitor() {
  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const [perm, requestPerm] = useCameraPermissions();

  // Use a ref + state pair so the interval closure always sees latest state
  const [state, _setState] = useState<State>("NORMAL");
  const stateRef = useRef<State>("NORMAL");
  const setState = (s: State) => {
    stateRef.current = s;
    _setState(s);
  };

  const [ear, setEar] = useState(0.28);
  const [mar, setMar] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(0.20);
  const thresholdRef = useRef(0.20); // ref so interval sees latest value without restarting

  const [alerts, setAlerts] = useState(0);
  const alertsRef = useRef(0); // ref so stopAndSave sees latest value
  const [start, setStart] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);

  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [reasons, setReasons] = useState<string>("—");
  const [blinks, setBlinks] = useState<number | null>(null);
  const [yawns, setYawns] = useState<number | null>(null);
  const [headPitch, setHeadPitch] = useState<number | null>(null);
  const [headNods, setHeadNods] = useState<number | null>(null);

  const belowCount = useRef(0);
  const aboveCount = useRef(0);
  const tick = useRef<NodeJS.Timeout | null>(null);
  const prevAlertLike = useRef(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const animateSheet = (open: boolean) => {
    Animated.timing(sheetAnim, {
      toValue: open ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const toggleSheet = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSheetOpen((o) => {
      const next = !o;
      animateSheet(next);
      return next;
    });
  };

  // Sync thresholdRef whenever state updates it
  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  useEffect(() => {
    (async () => {
      if (!perm?.granted) await requestPerm();

      const t = await loadThresholds();
      if (t) {
        setThreshold(t.earThreshold);
        thresholdRef.current = t.earThreshold;
      }

      const now = Date.now();
      setStart(now);
      startRef.current = now;

      tick.current = setInterval(async () => {
        const telem = await fetchTelemetry();

        if (telem && typeof telem.ear === "number") {
          setConnected(true);
          setLastUpdated(Date.now());

          setEar(telem.ear);
          setMar(typeof telem.mar === "number" ? telem.mar : null);
          setBlinks(typeof telem.blinks === "number" ? telem.blinks : null);
          setYawns(typeof telem.yawns === "number" ? telem.yawns : null);
          setHeadPitch(typeof telem.head_pitch === "number" ? telem.head_pitch : null);
          setHeadNods(typeof telem.head_nods === "number" ? telem.head_nods : null);

          const r =
            Array.isArray(telem.drowsy_reason) && telem.drowsy_reason.length
              ? telem.drowsy_reason.join(", ")
              : "—";
          setReasons(r);

          let nextState: State | null = null;

          if (typeof telem.stage === "number") {
            nextState = mapStageToState(telem.stage);
          } else if (typeof telem.is_drowsy === "boolean") {
            nextState = telem.is_drowsy ? "ALERT" : "NORMAL";
          }

          if (!nextState) {
            const res = fsmNext(
              stateRef.current,
              telem.ear,
              thresholdRef.current,
              belowCount.current,
              aboveCount.current
            );

            if (telem.ear < thresholdRef.current) {
              belowCount.current += 1;
              aboveCount.current = 0;
            } else {
              aboveCount.current += 1;
              belowCount.current = 0;
            }

            nextState = res.state;
          }

          const wasAlert = prevAlertLike.current;
          const isAlert = nextState === "ALERT";

          if (nextState !== stateRef.current) {
            setState(nextState);
          }

          if (isAlert && !wasAlert) {
            alertsRef.current += 1;
            setAlerts(alertsRef.current);
          }
          prevAlertLike.current = isAlert;

          return;
        }

        // --- Fallback: mock mode ---
        setConnected(false);

        const e = mockEar();
        setEar(e);
        setMar(null);
        setReasons("—");
        setBlinks(null);
        setYawns(null);
        setHeadPitch(null);
        setHeadNods(null);

        const res = fsmNext(
          stateRef.current,
          e,
          thresholdRef.current,
          belowCount.current,
          aboveCount.current
        );

        if (e < thresholdRef.current) {
          belowCount.current += 1;
          aboveCount.current = 0;
        } else {
          aboveCount.current += 1;
          belowCount.current = 0;
        }

        if (res.state !== stateRef.current) {
          setState(res.state);
          if (res.state === "ALERT") {
            alertsRef.current += 1;
            setAlerts(alertsRef.current);
          }
        }
      }, POLL_MS);
    })();

    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAndSave = async () => {
    if (tick.current) clearInterval(tick.current);
    if (!startRef.current) return;
    const durationSec = Math.round((Date.now() - startRef.current) / 1000);
    const sensitivity = await loadSensitivity();
    await saveSession({
      id: `session_${startRef.current}`,
      startedAt: startRef.current,
      durationSec,
      alerts: alertsRef.current,
      sensitivity,
    });
    alert(`Saved session. Duration ${durationSec}s, alerts ${alertsRef.current}`);
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

  const sheetMaxHeight = 420;
  const sheetHeight = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [210, sheetMaxHeight],
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* pointerEvents="none" prevents CameraView from blocking touches */}
      <CameraView style={{ flex: 1 }} facing="front" pointerEvents="none" />

      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Monitor</Text>
      </View>

      <View style={styles.topBadge}>
        <Text style={styles.topBadgeText}>
          Monitoring {connected ? "• Connected" : "• Mock Mode"}
        </Text>
      </View>

      <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
        <Pressable onPress={toggleSheet} style={styles.handleArea}>
          <View style={styles.handlePill} />
          <Text style={styles.handleText}>{sheetOpen ? "Hide metrics" : "Show metrics"}</Text>
        </Pressable>

        <View style={styles.sheetHeaderRow}>
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <StatusPill state={state} />
          </View>

          <View style={styles.liveBox}>
            <Text style={styles.liveLabel}>Live EAR</Text>
            <Text style={styles.liveValue}>{ear.toFixed(3)}</Text>
          </View>

          <View style={styles.liveBox}>
            <Text style={styles.liveLabel}>Threshold</Text>
            <Text style={styles.liveValue}>{threshold.toFixed(3)}</Text>
          </View>
        </View>

        <View style={styles.metricsWrap}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.summaryCard}>
              <MetricRow label="MAR" value={mar == null ? "—" : mar.toFixed(3)} mono />
              <View style={styles.summaryDivider} />
              <MetricRow label="Alerts" value={String(alerts)} mono />
              <View style={styles.summaryDivider} />
              <MetricRow
                label="Last Update"
                value={lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "—"}
              />
            </View>

            {sheetOpen ? (
              <View style={{ marginTop: 10 }}>
                <AccordionItem title="Drowsiness reason" rightValue={reasons}>
                  <Text style={styles.bodyText}>{reasons}</Text>
                </AccordionItem>

                <AccordionItem
                  title="Blinks / Yawns"
                  rightValue={`${blinks ?? "—"} / ${yawns ?? "—"}`}
                >
                  <View style={styles.kvGrid}>
                    <MetricRow label="Blinks" value={blinks == null ? "—" : String(blinks)} mono />
                    <MetricRow label="Yawns" value={yawns == null ? "—" : String(yawns)} mono />
                  </View>
                </AccordionItem>

                <AccordionItem
                  title="Pitch / Nods"
                  rightValue={`${headPitch ?? "—"} / ${headNods ?? "—"}`}
                >
                  <View style={styles.kvGrid}>
                    <MetricRow
                      label="Head pitch"
                      value={headPitch == null ? "—" : String(headPitch)}
                      mono
                    />
                    <MetricRow
                      label="Head nods"
                      value={headNods == null ? "—" : String(headNods)}
                      mono
                    />
                  </View>
                </AccordionItem>

                <AccordionItem title="Connection" rightValue={connected ? "Connected" : "Mock"}>
                  <Text style={styles.bodyText}>
                    {connected
                      ? "POC: Showing EAR/MAR from Neha/Camille endpoint."
                      : "No endpoint found: running UI using mock EAR."}
                  </Text>
                </AccordionItem>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <Pressable style={[styles.cta, styles.stop]} onPress={stopAndSave}>
          <Text style={styles.ctaText}>Stop & Save</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 6,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: 8,
  },
  topTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 12,
  },
  topBadge: {
    position: "absolute",
    top: 46,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  topBadgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "#cfe6ff",
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    overflow: "hidden",
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 10,
  },
  handlePill: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.18)",
    marginBottom: 6,
  },
  handleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },
  sheetHeaderRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  liveBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
    marginBottom: 4,
  },
  liveValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "rgba(0,0,0,0.85)",
  },
  metricsWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.45)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 10,
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    gap: 12,
  },
  metricLabel: {
    color: "rgba(0,0,0,0.68)",
    fontWeight: "900",
    fontSize: 13,
  },
  metricValue: {
    color: "rgba(0,0,0,0.85)",
    fontWeight: "900",
    fontSize: 14,
    flexShrink: 1,
    textAlign: "right",
  },
  mono: {
    fontVariant: ["tabular-nums"],
  },
  accordionItem: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 10,
    overflow: "hidden",
  },
  accordionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "rgba(0,0,0,0.75)",
  },
  accordionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "55%",
  },
  accordionRightText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(0,0,0,0.55)",
  },
  chev: {
    fontSize: 16,
    fontWeight: "900",
    color: "rgba(0,0,0,0.50)",
    width: 16,
    textAlign: "center",
  },
  accordionBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 0,
  },
  bodyText: {
    color: "rgba(0,0,0,0.70)",
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 18,
  },
  kvGrid: {
    marginTop: 6,
  },
  cta: {
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  stop: { backgroundColor: "#22c55e" },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 18 },
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
  permBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
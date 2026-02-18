import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Dimensions,
  ScrollView,
  StyleSheet,
} from "react-native";
import { BarChart as RNBarChart } from "react-native-chart-kit";
import { loadSessions } from "../lib/store";
import { SessionSummary } from "../lib/types";

const BarChart = RNBarChart as unknown as React.ComponentType<any>;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function History() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  useEffect(() => {
    loadSessions().then(setSessions);
  }, []);

  const weeklyAlerts = useMemo(() => {
    const totals = new Array(7).fill(0);
    const now = Date.now();
    const sevenDaysAgo = now - 6 * 24 * 60 * 60 * 1000;

    sessions.forEach((s) => {
      if (s.startedAt >= sevenDaysAgo) {
        const day = new Date(s.startedAt).getDay();
        totals[day] += s.alerts ?? 0;
      }
    });

    const today = new Date().getDay();
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = (today - i + 7) % 7;
      labels.push(DAY_LABELS[d]);
      data.push(totals[d]);
    }

    const totalWeek = data.reduce((s, x) => s + x, 0);
    return { labels, data, totalWeek };
  }, [sessions]);

  const chartWidth = Dimensions.get("window").width - 32;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>History</Text>

      {/* Chart card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Alerts (Last 7 Days)</Text>
          <Text style={styles.cardPill}>Total: {weeklyAlerts.totalWeek}</Text>
        </View>

        {/* IMPORTANT: chart must have a real background color (not transparent) */}
        <View style={styles.chartWrap}>
          <BarChart
            data={{
              labels: weeklyAlerts.labels,
              datasets: [{ data: weeklyAlerts.data }],
            }}
            width={chartWidth - 28} // card padding + chartWrap padding
            height={220}
            fromZero
            showValuesOnTopOfBars
            yAxisLabel=""
            yAxisSuffix=""
            withInnerLines={true}
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(139, 0, 0, ${opacity})`, // bar color
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // axis labels
              propsForBackgroundLines: { stroke: "rgba(0,0,0,0.08)" },
              propsForLabels: { fontWeight: "800" },
              barPercentage: 0.55,
              fillShadowGradient: "#8b0000",
              fillShadowGradientOpacity: 0.85,
            }}
            style={styles.chart}
          />
        </View>

        <Text style={styles.caption}>
          Bars represent the sum of alerts per day across saved sessions.
        </Text>
      </View>

      {/* Sessions list */}
      <Text style={styles.sectionTitle}>Sessions</Text>

      <FlatList
        data={[...sessions].sort((a, b) => b.startedAt - a.startedAt)}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.sessionCard}>
            <View style={styles.sessionTopRow}>
              <Text style={styles.sessionDate}>
                {new Date(item.startedAt).toLocaleString()}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Alerts: {item.alerts ?? 0}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                Duration:{" "}
                {Math.max(0, Math.round(((item.durationSec ?? 0) as number) / 60))}{" "}
                min
              </Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>
                Sensitivity: {item.sensitivity ?? "—"}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyText}>
              Run a monitoring session and tap Stop & Save to populate history.
            </Text>
          </View>
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#cfe6ff" },
  content: { padding: 16, paddingBottom: 24 },

  title: { fontSize: 28, fontWeight: "900", color: "#111", marginBottom: 12 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
    marginTop: 8,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  cardPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.08)",
    fontWeight: "900",
    color: "#111",
    overflow: "hidden",
  },

  // Key fix: give the chart a white surface and clip it
  chartWrap: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  chart: {
    borderRadius: 14,
  },

  caption: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },

  sessionCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    marginBottom: 10,
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  sessionDate: { flex: 1, fontSize: 14, fontWeight: "900", color: "#111" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(139,0,0,0.10)",
    borderWidth: 1,
    borderColor: "rgba(139,0,0,0.18)",
  },
  badgeText: { fontSize: 12, fontWeight: "900", color: "#8b0000" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 13, fontWeight: "800", color: "rgba(0,0,0,0.70)" },
  metaDot: { fontSize: 14, fontWeight: "900", color: "rgba(0,0,0,0.35)" },

  emptyWrap: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#111", marginBottom: 4 },
  emptyText: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.60)" },
});


import AsyncStorage from "@react-native-async-storage/async-storage";
import { SessionSummary, Thresholds, Sensitivity } from "./types";

const SESSIONS_KEY = "sessions_v1";
const THRESHOLDS_KEY = "thresholds_v1";
const SETTINGS_KEY = "settings_v1";

export async function loadSessions(): Promise<SessionSummary[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}
export async function saveSession(s: SessionSummary) {
  const arr = await loadSessions();
  arr.unshift(s);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(arr));
}

export async function saveThresholds(t: Thresholds) {
  await AsyncStorage.setItem(THRESHOLDS_KEY, JSON.stringify(t));
}
export async function loadThresholds(): Promise<Thresholds | null> {
  const raw = await AsyncStorage.getItem(THRESHOLDS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveSensitivity(s: Sensitivity) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ sensitivity: s }));
}
export async function loadSensitivity(): Promise<Sensitivity> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? JSON.parse(raw).sensitivity : "Balanced";
}

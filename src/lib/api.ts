export const API_BASE =
  // for Expo Web (browser)
  typeof window !== "undefined"
    ? "http://127.0.0.1:8000"
    // for phone builds, replace with your laptop LAN IP
    : "http://192.168.1.163:8000";
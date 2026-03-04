export type Sensitivity = "Conservative" | "Balanced" | "Aggressive";

export type SessionSummary = {
  id: string;
  startedAt: number;      // Date.now()
  durationSec: number;
  alerts: number;
  sensitivity: Sensitivity;
};

export type Thresholds = {
  earOpen: number;
  earClosed: number;
  earThreshold: number;
};

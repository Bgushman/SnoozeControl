export type State = "NORMAL" | "WARNING" | "ALERT";

export function fsmNext(
  prev: State,
  ear: number,
  threshold: number,
  belowCount: number,
  aboveCount: number
): { state: State; resetBelow: boolean; resetAbove: boolean } {
  // Require consecutive frames below/above threshold to change state (debounce).
  const below = ear < threshold;

  switch (prev) {
    case "NORMAL":
      if (below && belowCount >= 3) return { state: "WARNING", resetBelow: true, resetAbove: true };
      return { state: "NORMAL", resetBelow: false, resetAbove: !below };
    case "WARNING":
      if (below && belowCount >= 10) return { state: "ALERT", resetBelow: true, resetAbove: true };
      if (!below && aboveCount >= 3) return { state: "NORMAL", resetBelow: true, resetAbove: true };
      return { state: "WARNING", resetBelow: !below, resetAbove: below };
    case "ALERT":
      if (!below && aboveCount >= 15) return { state: "NORMAL", resetBelow: true, resetAbove: true };
      return { state: "ALERT", resetBelow: !below, resetAbove: below };
  }
}

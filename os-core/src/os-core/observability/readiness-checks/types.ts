export type ReadinessCheckResult =
  | { status: "PASS"; detail: string }
  | { status: "FAIL"; detail: string };

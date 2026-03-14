import type { ReadinessCheckResult } from "./types";

export async function checkAudioContextSupport(): Promise<ReadinessCheckResult> {
  const supported =
    typeof window !== "undefined" &&
    (typeof window.AudioContext !== "undefined" ||
      typeof (window as Window & { webkitAudioContext?: unknown }).webkitAudioContext !==
        "undefined");

  return supported
    ? { status: "PASS", detail: "Web Audio API available" }
    : { status: "FAIL", detail: "AudioContext is unavailable in this environment" };
}

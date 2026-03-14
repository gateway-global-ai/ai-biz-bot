import type { ReadinessCheckResult } from "./types";

export async function checkMicrophoneHardware(): Promise<ReadinessCheckResult> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      return {
        status: "FAIL",
        detail: "Browser does not expose microphone access",
      };
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());

    return {
      status: "PASS",
      detail: "Granted and hardware available",
    };
  } catch {
    return {
      status: "FAIL",
      detail: "Denied or unavailable",
    };
  }
}

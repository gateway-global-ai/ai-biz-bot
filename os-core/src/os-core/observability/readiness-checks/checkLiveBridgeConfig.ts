import { getLiveBridgeConfig } from "../../execution-plane/gemini-live-engine/bridgeRuntime";
import type { ReadinessCheckResult } from "./types";

export async function checkLiveBridgeConfig(): Promise<ReadinessCheckResult> {
  const bridgeUrl = getLiveBridgeConfig().webSocketUrl;
  const valid =
    typeof bridgeUrl === "string" &&
    bridgeUrl.length > 10 &&
    /^wss?:\/\//.test(bridgeUrl);

  return valid
    ? { status: "PASS", detail: "Resolved and sanitized" }
    : { status: "FAIL", detail: "Missing or invalid ws/wss endpoint" };
}

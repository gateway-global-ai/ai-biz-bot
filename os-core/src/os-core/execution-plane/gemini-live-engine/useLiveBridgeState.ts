import { useEffect, useState } from "react";

import {
  getActiveBridgeConnectionState,
  subscribeToActiveBridgeState,
} from "./bridgeRuntime";
import type { BridgeConnectionSnapshot } from "./IGeminiExecutionBridge";

export function useLiveBridgeState(): BridgeConnectionSnapshot {
  const [state, setState] = useState<BridgeConnectionSnapshot>(
    getActiveBridgeConnectionState()
  );

  useEffect(() => subscribeToActiveBridgeState(setState), []);

  return state;
}

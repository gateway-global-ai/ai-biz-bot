import { useEffect, useMemo, useRef, useState } from "react";
import { useOSEventLog } from "./EventLogProvider";
import { loadActions } from "../control-plane/registry-loader/loadActions";
import { loadAgentPolicies } from "../control-plane/registry-loader/loadAgentPolicies";
import { loadLogicalRoutes } from "../control-plane/registry-loader/loadLogicalRoutes";
import { loadUIElements } from "../control-plane/registry-loader/loadUIElements";
import { loadViews } from "../control-plane/registry-loader/loadViews";
import { checkAudioContextSupport } from "./readiness-checks/checkAudioContextSupport";
import { checkLiveBridgeConfig } from "./readiness-checks/checkLiveBridgeConfig";
import { checkRegistryIntegrity } from "./readiness-checks/checkRegistryIntegrity";
import { checkMicrophoneHardware } from "./readiness-checks/checkMicrophoneHardware";
import { checkSessionStorageQuota } from "./readiness-checks/checkSessionStorageQuota";
import { appendSystemEvent } from "./system-events";

export type ReadinessPhase = "BOOTING" | "CHECKING_ENV" | "READY" | "BLOCKED";
export type CheckStatus = "checking" | "ok" | "error";

export interface ReadinessCheck {
  label: string;
  status: CheckStatus;
  detail: string;
  critical: boolean;
}

export interface SystemReadinessState {
  phase: ReadinessPhase;
  checks: {
    gemini: ReadinessCheck;
    storage: ReadinessCheck;
    microphone: ReadinessCheck;
    audioContext: ReadinessCheck;
    registryIntegrity: ReadinessCheck;
    uiElements: ReadinessCheck;
  };
  allCriticalChecksPassed: boolean;
}

function createCheckingState(): SystemReadinessState {
  return {
    phase: "BOOTING",
    checks: {
      gemini: {
        label: "LIVE_BRIDGE_URL",
        status: "checking",
        detail: "Checking readiness signal...",
        critical: true,
      },
      storage: {
        label: "SESSION_STORAGE",
        status: "checking",
        detail: "Checking local persistence...",
        critical: true,
      },
      microphone: {
        label: "MICROPHONE",
        status: "checking",
        detail: "Checking hardware permission...",
        critical: true,
      },
      audioContext: {
        label: "AUDIO_CONTEXT",
        status: "checking",
        detail: "Checking Web Audio support...",
        critical: true,
      },
      registryIntegrity: {
        label: "REGISTRY_INTEGRITY",
        status: "checking",
        detail: "Checking registry population...",
        critical: true,
      },
      uiElements: {
        label: "UI_ELEMENTS",
        status: "checking",
        detail: "Checking governed interface map...",
        critical: true,
      },
    },
    allCriticalChecksPassed: false,
  };
}

export function useSystemReadiness(): SystemReadinessState {
  const [state, setState] = useState<SystemReadinessState>(createCheckingState);
  const { appendEvent } = useOSEventLog();
  const bootLoggedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function runChecks() {
      if (!bootLoggedRef.current) {
        appendSystemEvent("BOOT_STARTED", "System readiness state machine started.");
        appendEvent({
          category: "SYSTEM_LIFECYCLE",
          os_state_snapshot: {
            shell_mode: "ptt_first",
            active_route_id: "os.home",
            active_view_id: "os-home-view",
            breadcrumbs: ["Home"],
          },
          payload: {
            type: "BOOT_STARTED",
          },
        });
        bootLoggedRef.current = true;
      }

      setState((current) => ({
        ...current,
        phase: "CHECKING_ENV",
      }));

      const routesRegistry = loadLogicalRoutes();
      const agentPoliciesRegistry = loadAgentPolicies();
      const actionsRegistry = loadActions();
      const uiElementsRegistry = loadUIElements();
      const viewsRegistry = loadViews();

      const [
        geminiResult,
        storageResult,
        microphoneResult,
        audioContextResult,
        registryIntegrityResult,
        uiElementsResult,
      ] = await Promise.all([
        checkLiveBridgeConfig(),
        checkSessionStorageQuota(),
        checkMicrophoneHardware(),
        checkAudioContextSupport(),
        checkRegistryIntegrity({
          routes: routesRegistry,
          agents: agentPoliciesRegistry,
          actions: actionsRegistry,
          views: viewsRegistry,
        }),
        checkRegistryIntegrity({
          routes: routesRegistry,
          agents: agentPoliciesRegistry,
          actions: {
            ...actionsRegistry,
            actions: uiElementsRegistry.elements.length ? actionsRegistry.actions : [],
          },
          views: viewsRegistry,
        }).then((result) =>
          uiElementsRegistry.elements.length > 0
            ? { status: "PASS" as const, detail: "Governed interface map populated" }
            : { status: "FAIL" as const, detail: "No governed UI elements found" }
        ),
      ]);

      if (cancelled) return;

      const geminiOk = geminiResult.status === "PASS";
      const storageOk = storageResult.status === "PASS";
      const microphoneOk = microphoneResult.status === "PASS";
      const audioContextOk = audioContextResult.status === "PASS";
      const registryIntegrityOk = registryIntegrityResult.status === "PASS";
      const uiElementsOk = uiElementsResult.status === "PASS";

      const next: SystemReadinessState = {
        phase:
          geminiOk &&
          storageOk &&
          microphoneOk &&
          audioContextOk &&
          registryIntegrityOk &&
          uiElementsOk
            ? "READY"
            : "BLOCKED",
        checks: {
          gemini: {
            label: "LIVE_BRIDGE_URL",
            status: geminiOk ? "ok" : "error",
            detail: geminiResult.detail,
            critical: true,
          },
          storage: {
            label: "SESSION_STORAGE",
            status: storageOk ? "ok" : "error",
            detail: storageResult.detail,
            critical: true,
          },
          microphone: {
            label: "MICROPHONE",
            status: microphoneOk ? "ok" : "error",
            detail: microphoneResult.detail,
            critical: true,
          },
          audioContext: {
            label: "AUDIO_CONTEXT",
            status: audioContextOk ? "ok" : "error",
            detail: audioContextResult.detail,
            critical: true,
          },
          registryIntegrity: {
            label: "REGISTRY_INTEGRITY",
            status: registryIntegrityOk ? "ok" : "error",
            detail: registryIntegrityResult.detail,
            critical: true,
          },
          uiElements: {
            label: "UI_ELEMENTS",
            status: uiElementsOk ? "ok" : "error",
            detail: uiElementsResult.detail,
            critical: true,
          },
        },
        allCriticalChecksPassed:
          geminiOk &&
          storageOk &&
          microphoneOk &&
          audioContextOk &&
          registryIntegrityOk &&
          uiElementsOk,
      };

      if (next.phase === "READY") {
        appendSystemEvent("PREFLIGHT_PASSED", "All critical pre-flight checks passed.", {
          checks: next.checks,
        });
        appendEvent({
          category: "SYSTEM_LIFECYCLE",
          os_state_snapshot: {
            shell_mode: "ptt_first",
            active_route_id: "os.home",
            active_view_id: "os-home-view",
            breadcrumbs: ["Home"],
          },
          payload: {
            type: "PREFLIGHT_PASSED",
            checks: next.checks,
          },
        });
      } else {
        appendSystemEvent("PREFLIGHT_BLOCKED", "One or more critical pre-flight checks failed.", {
          checks: next.checks,
        });
        appendEvent({
          category: "SYSTEM_LIFECYCLE",
          os_state_snapshot: {
            shell_mode: "ptt_first",
            active_route_id: "os.home",
            active_view_id: "os-home-view",
            breadcrumbs: ["Home"],
          },
          payload: {
            type: "PREFLIGHT_BLOCKED",
            checks: next.checks,
          },
        });
      }

      setState(next);
    }

    void runChecks();

    return () => {
      cancelled = true;
    };
  }, [appendEvent]);

  return useMemo(() => state, [state]);
}

import MissionControlRuntime from "../../../os-core/src/app/MissionControlRuntime";
import { ConciergePanel } from "@/components/chat/ConciergePanel";

/**
 * Browser entry: wires client ConciergePanel into os-core without os-core importing client.
 */
export default function MissionControlApp() {
  return <MissionControlRuntime conciergePanel={ConciergePanel} />;
}

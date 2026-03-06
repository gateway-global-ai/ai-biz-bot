/**
 * Sovereign Three.js backgrounds — canonical entry point for NetworkScene and CoreScene.
 * Implementation lives in QuantumScene.tsx; this file provides a stable import path
 * for Cursor rules and consumers (e.g. "add a cool background" / "Sovereign Network background").
 */
export { NetworkScene, CoreScene } from "./QuantumScene";
import { NetworkScene } from "./QuantumScene";

/** Default: the distributed AI Business Router / hero background. */
export default NetworkScene;

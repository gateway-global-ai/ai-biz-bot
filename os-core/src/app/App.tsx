import React from "react";
import MissionControlRuntime from "./MissionControlRuntime";

/**
 * Governance rule:
 * App.tsx may bootstrap the OS. It may not define the OS.
 */
export default function App() {
  return <MissionControlRuntime />;
}

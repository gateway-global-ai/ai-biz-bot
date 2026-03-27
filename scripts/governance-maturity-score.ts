#!/usr/bin/env npx tsx
/**
 * Heuristic governance maturity snapshot (0–10 per vector).
 * Evidence is file/path-based; human review overrides script output.
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function exists(rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

const vectors: { id: string; score: () => number; evidence: string[] }[] = [
  {
    id: "zero_llm",
    score: () => {
      let s = 6;
      if (exists("server/routes/secureVaultRoutes.ts")) s += 2;
      if (exists("server/services/intakePolicyService.ts")) s += 1;
      if (exists("server/services/sensitiveInputGuard.ts")) s += 1;
      return Math.min(10, s);
    },
    evidence: ["secureVaultRoutes", "intakePolicyService", "sensitiveInputGuard"],
  },
  {
    id: "multimodal_switching",
    score: () => {
      let s = 4;
      if (exists("server/services/conversationGrounding.ts")) s += 3;
      if (exists("server/routes/telephonyRoutes.ts")) s += 2;
      return Math.min(10, s);
    },
    evidence: ["conversationGrounding", "telephonyRoutes"],
  },
  {
    id: "transparency_disclosure",
    score: () => {
      let s = 6;
      if (exists("server/services/disclosurePolicy.ts")) s += 2;
      if (exists("migrations")) s += 1;
      return Math.min(10, s);
    },
    evidence: ["disclosurePolicy", "communication_governance column"],
  },
  {
    id: "arch_enforcement",
    score: () => {
      let s = 5;
      if (exists("server/services/archEnvelopeValidator.ts")) s += 4;
      if (exists("server/services/promptCompiler.ts")) s += 1;
      return Math.min(10, s);
    },
    evidence: ["archEnvelopeValidator", "promptCompiler"],
  },
  {
    id: "character_stability",
    score: () => {
      let s = 4;
      if (exists("server/services/stabilityDials.ts")) s += 4;
      if (exists("server/services/promptCompiler.ts")) s += 2;
      return Math.min(10, s);
    },
    evidence: ["stabilityDials", "promptCompiler"],
  },
  {
    id: "latency_turn_taking",
    score: () => {
      let s = 4;
      if (exists("server/services/conversationLatencyMetrics.ts")) s += 3;
      if (exists("client/src/services/voice/GeminiStreamingClient.ts")) s += 2;
      return Math.min(10, s);
    },
    evidence: ["conversationLatencyMetrics", "GeminiStreamingClient"],
  },
];

console.log("Sovereign OS — Communication Governance Maturity (heuristic)\n");
for (const v of vectors) {
  console.log(`${v.id}: ${v.score()}/10`);
  console.log(`  evidence: ${v.evidence.join(", ")}\n`);
}

---
name: clean-room-extraction
description: "Governed zero-trust import pipeline for external code, SDKs, ZIPs, repos, and documentation. Quarantines, scans, extracts minimal artifacts, certifies through the knowledge plane, and incinerates. Never executes, never trusts by default."
---

# SKILL: Clean Room Extraction & Quarantine Protocol (V2 — Canonical)

A **governed, zero-trust import pipeline** for external code, SDKs, ZIP exports, repositories, and documentation.

This protocol ensures that:
- External code is **never executed or trusted by default**
- All imports are **classified, scanned, and certified** through the knowledge plane
- Only **minimal, extracted, policy-approved artifacts** are promoted
- The system remains aligned with **AI OS Doctrine: no implicit authority** (Doctrine 11)

## Core Principles

1. **External code is untrusted by default** — `certificationLevel: unverified`, `execution_allowed: false`
2. **Extraction > Installation** — build minimal adapters from docs, never `npm install massive-sdk`
3. **Knowledge ≠ Execution** — extracted types and docs are knowledge items, not runnable code
4. **Inference ≠ Authority** — AI-generated analysis of extracted code cannot be `approved` or `trusted`
5. **Everything is auditable and reversible** — `import_quarantine_runs` table + `knowledge_audit_log`

## Trigger

When the user requests:
- **"Execute Clean Room Extraction on [Path/ZIP/URL]"**
- **"Run Clean Room on [Folder]"**
- **"Import [SDK/package] safely"**
- When a coding agent requests an external dependency via the intent loop

## Source Classification (MANDATORY)

Every import must be classified before any processing. Map to existing `KnowledgeSourceType`:

| Source | `sourceType` | Default `certificationLevel` | Notes |
|--------|------------|----------------------------|-------|
| Internal trusted | `system` | `approved` | DB, PMS integrations |
| Owner uploads | `owner` | `trusted` | PDFs, SOPs, docs |
| Scraped websites | `web` | `unverified` | crawled pages |
| External repo/ZIP/SDK | `external` | `unverified` | **this protocol** |
| AI-generated analysis | `inference` | `unverified` | **NEVER** `approved` or `trusted` |

---

## Phase 1: Quarantine (Isolate & Contain)

### Location
```
/tmp/_quarantine_extraction_<runId>
```
Where `<runId>` is a UUID from `import_quarantine_runs`.

### Hard Constraints
- ❌ No execution (`node`, `python`, `sh`, etc.)
- ❌ No dependency install (`npm install`, `pip install`, etc.)
- ❌ No network access (unless explicitly granted for scanning via `PolicyDecision`)
- ❌ No secrets or environment variables exposed
- ❌ No writes to project directories until Phase 5 promotion
- ❌ No reading from quarantine after incineration

### Mandatory Ignore List
Skip entirely — do not parse, read, or extract from:
- `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `tsconfig.json`, `vite.config.*`, `webpack.config.*`, build configs
- `App.tsx`, `index.tsx`, `main.tsx`, entry points
- `routes/*.ts`, `server/**` routing/server files
- WebSocket handlers, voice pipeline files
- CI/CD configs (`.github/`, `.gitlab-ci.yml`, etc.)
- Any executable scripts (`*.sh`, `Makefile`, `Dockerfile`)

---

## Phase 2: Security & Supply Chain Scan

Perform **read-only static analysis** of quarantined contents:

### Scan Targets
- **Dependency tree** — extract declared deps without installing
- **License detection** — MIT/Apache/GPL/proprietary/unknown
- **Suspicious patterns:**
  - `eval()`, `Function()`, dynamic code execution
  - `fetch()`, `XMLHttpRequest`, `net.connect()` — network calls
  - `fs.write*`, `fs.unlink` — filesystem mutations
  - `child_process`, `exec`, `spawn` — subprocess execution
  - Hardcoded credentials, API keys, tokens
  - `__proto__`, prototype pollution patterns
  - Minified/obfuscated code blocks

### Output: `ImportScanResult`
```ts
{
  riskLevel: "low" | "medium" | "high" | "critical",
  suspiciousFiles: string[],
  suspiciousPatterns: { file: string; pattern: string; line: number }[],
  dependencySummary: Record<string, string>,
  license: string | "unknown",
  flags: string[],
  fileCount: number,
  totalSizeBytes: number,
}
```

**Gate:** If `riskLevel === "critical"`, the run is blocked automatically.

---

## Phase 3: Reconnaissance (Structured Extraction)

Extract **only** allowed artifact types:

### Allowed Artifacts
- TypeScript interfaces / type definitions / schemas
- API shapes (request/response contracts)
- UI tokens (Tailwind config values, color palettes, spacing scales)
- Pure functions (no side effects, no I/O, no state)
- Mock data / fixture data
- Documented usage examples
- README / API documentation sections

### Explicitly Forbidden (even from extraction)
- Routing logic
- WebSocket / real-time handlers
- SDK initialization / client constructors
- Authentication / authorization logic
- Service layers / database access
- Runtime execution code
- Build/bundler configuration

---

## Phase 4: Documentation (Controlled Output)

Create extraction report:
```
/.system_design/extractions/extraction_<runId>.md
```

### Required Sections
1. **Source Metadata** — origin, URL/path, size, file count, scan timestamp
2. **Risk Assessment** — `ImportScanResult` summary, flags, suspicious files
3. **Type Definitions** — raw TypeScript interfaces/types extracted
4. **Extracted Logic** — pure functions only, with provenance comments
5. **UI Blueprint** — Tailwind tokens, color values, spacing, component patterns
6. **Mock Data Inventory** — fixture data suitable for development
7. **Security Flags** — hardcoded keys, suspicious patterns, license issues
8. **Dependency Summary** — what the source declares, NOT installed
9. **Recommended Minimal Adapter** — the smallest integration surface needed

---

## Phase 5: SDK Extraction (NOT Installation)

### Default Mode: Extract Adapter

Instead of:
```bash
npm install massive-sdk  # ❌ NEVER default
```

Produce:
```ts
// minimal adapter — extracted from SDK docs, not installed
export async function callServiceEndpoint(params: ServiceParams): Promise<ServiceResponse> {
  const response = await fetch("https://api.service.com/v1/endpoint", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return response.json();
}
```

### SDK Import Modes

| Mode | Description | Requires |
|------|-------------|----------|
| `docs_only` | Parse API docs, extract types/contracts | Default |
| `extract_adapter` | Build minimal `fetch()` wrapper from docs | Default |
| `install_package` | Full `npm install` with dependency tree | **Escalation + explicit approval** via `PolicyDecision` |

`install_package` mode requires:
- `PolicyDecision.verdict === "allow"`
- `allowedSourceTypes` includes `"external"`
- Scan must pass with `riskLevel !== "critical"`
- Operator/admin explicit approval

---

## Phase 6: Knowledge Certification

Convert extracted artifacts into governed knowledge items:

```ts
{
  sourceType: "external",
  certificationLevel: "unverified",
  certificationSource: "auto_heuristic",
  confidenceScore: 0.4,
  dimensionId: "sdk_extraction",
}
```

### Promotion Path
- `unverified` → `trusted`: After operator review + approval
- `trusted` → `approved`: **NEVER for external code** — only `system` sourceType can be `approved`
- The DB constraint `chk_inference_not_approved` prevents AI analysis from becoming authoritative

---

## Phase 7: Policy Enforcement

Before any extracted artifact is used, it passes through:

```ts
PolicyDecision.allowedKnowledgeLevels
PolicyDecision.allowedSourceTypes
```

| Context | Allowed Levels | Allowed Sources |
|---------|---------------|-----------------|
| Concierge Q&A | `trusted` + `approved` | `system`, `owner`, `external` |
| Billing actions | `approved` only | `system` only |
| Coding agent | `unverified` + `trusted` | `external` (extract_adapter only) |
| Voice live | `approved` + `trusted` | `system`, `owner` |

---

## Phase 8: Incineration (Mandatory)

After extraction report is generated and artifacts are certified:

```bash
rm -rf /tmp/_quarantine_extraction_<runId>
```

The quarantine run must record:
- `incineratedAt` timestamp
- Confirmation that no quarantine files persist
- Hash of extraction report for integrity

**System confirms:** `"Quarantine burned. No external code persists."`

---

## Phase 9: Audit Logging

Every quarantine run records to `import_quarantine_runs`:

```ts
{
  id: uuid,
  sourceUri: string,
  sourceType: "external",
  sdkMode: "docs_only" | "extract_adapter" | "install_package",
  scanResult: ImportScanResult,
  extractedArtifacts: string[],
  certificationLevel: "unverified",
  promotedLevel: "trusted" | null,
  violations: string[],
  incineratedAt: timestamp,
  orchestrationRunId: string | null,
  intentExecutionId: string | null,
  createdAt: timestamp,
}
```

---

## Doctrine Violations (ENFORCED)

These are wired into `ORCHESTRATION_VIOLATION_TYPE` and `DOCTRINE_VIOLATION_CODES`:

| Code | Trigger |
|------|---------|
| `quarantine_direct_execution` | Code executed inside quarantine |
| `quarantine_package_install_bypass` | Package installed without approval |
| `quarantine_unscanned_import` | Source imported into workspace without scan |
| `DOCTRINE_VIOLATION_INFERENCE_AS_AUTHORITY` | AI analysis of extracted code treated as trusted |
| `quarantine_routing_import` | Routing/server logic extracted (forbidden) |
| `quarantine_dependency_trust_bypass` | Dependency bypassed scan pipeline |

---

## Promotion Rules

To move extracted artifacts from quarantine → usable knowledge:

1. Must pass security scan (`riskLevel` ≠ `critical`)
2. Must be documented in extraction report
3. Must be policy-allowed (`PolicyDecision`)
4. Must be explicitly approved by operator (for `trusted` promotion)
5. Must use minimal extraction (`extract_adapter`) when possible
6. Must have an `import_quarantine_runs` audit record

---

## Integration with Coding Orchestrator Engine

When a coding agent needs an external dependency:

```
intent → request import (via actionRequest)
  → quarantine (Phase 1)
  → scan (Phase 2)
  → extract (Phase 3-5)
  → certify as unverified knowledge (Phase 6)
  → submit evidence (extraction report)
  → await operator approval for promotion
  → proceed with extracted adapter (NOT full install)
```

**NO direct import is allowed.** The coding agent cannot bypass this pipeline.

---

## Project Guardrails

- **Legacy archive:** Normal workspace rules forbid reading from `_legacy_archive/`. The Clean Room protocol is the **authorized bypass**: user may direct extraction from a path inside the archive; extract to `/tmp/_quarantine_extraction_<runId>` first, then run Phases 2–8. Do not leave extracted files in agent-accessible project folders after the report is written.
- **No merge of sensitive logic:** Under no circumstances should external service layers, WebSocket handlers, or routing logic from the quarantine zone be merged into the active project files during this protocol. Extraction is documentation-only unless the user explicitly requests integration in a follow-up step with policy approval.
- **Package ecosystems are compromised vectors:** npm, PyPI, and all package registries are treated as untrusted. Updates and dependencies MUST pass quarantine before any use.

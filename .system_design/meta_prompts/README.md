# Meta prompt artifacts (v1)

Governed **assignment envelopes** for orchestration/workflow steps — not routing, not policy, not a mega-prompt.

**Law:** [`docs-governance/canonical/META_PROMPT_ENVELOPES.md`](../../docs-governance/canonical/META_PROMPT_ENVELOPES.md)  
**Runtime contract:** [`docs-governance/canonical/META_PROMPT_RUNTIME_CONTRACT.md`](../../docs-governance/canonical/META_PROMPT_RUNTIME_CONTRACT.md)  
**Registry:** [`registry-yaml/state_meta_prompt_binding.yaml`](../../registry-yaml/state_meta_prompt_binding.yaml)

## Files

| Artifact ID | File |
|---------------|------|
| `META_AGENT_SPEC_CREATION_v1` | `META_AGENT_SPEC_CREATION_v1.md` |
| `META_SKILL_MAPPING_v1` | `META_SKILL_MAPPING_v1.md` |
| `META_APTITUDE_TEST_v1` | `META_APTITUDE_TEST_v1.md` |

Add new versions as `*_v2.md` and update the registry; keep old versions for audit replay.

## Usage

1. State machine enters a step → if this step may call an LLM, **binding is mandatory** (`bindings` in YAML). **No binding → no LLM execution.**  
2. Resolve **artifact path** from `state_meta_prompt_binding.yaml` only — **no free-floating prompts.**  
3. Attach validated inputs only; run output through schema/validator.  
4. **Every** meta-prompted run **must** log: state id, artifact id/version, inputs present/missing, output validity, failure reason.  
5. **Hard block** if required inputs missing, state mismatch, or output invalid — **no exceptions.**

States that never call an LLM belong in `deterministic_states_without_meta_prompt` in the registry.

Do not embed industry or tenant truth in these files — only reasoning shape, constraints, and output structure.

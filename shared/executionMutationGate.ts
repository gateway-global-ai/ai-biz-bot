import { z } from "zod";

/**
 * Shared envelope for governed execution (mutations).
 * v0: single kind `gemini_tool_invocation` — normalize model-originated tool calls before `handleToolCall`.
 * Extend with z.discriminatedUnion("mutationKind", [...]) when adding integration_capability_invocation, etc.
 *
 * @see docs-governance/canonical/EXECUTION_MUTATION_GATE_SPEC_V1.md
 */

export const EXECUTION_MUTATION_TRANSPORTS = [
  "browser_live",
  "pstn",
  "chat_http",
  "skill_dispatch",
  "canvas_http",
  "internal",
] as const;

export type ExecutionMutationTransport = (typeof EXECUTION_MUTATION_TRANSPORTS)[number];

export const ExecutionMutationCallerSchema = z.object({
  actor: z.enum(["model_proposal", "human", "system", "canvas_syscall"]),
  correlationId: z.string().min(1).optional(),
});

export const ExecutionMutationContextSchema = z.object({
  siteConfigId: z.string().min(1).optional(),
  /** HTTP route, WebSocket path, or internal module id — required for audit. */
  routeOrSource: z.string().min(1),
  transport: z.enum(EXECUTION_MUTATION_TRANSPORTS),
});

export const GeminiToolInvocationSchema = z.object({
  mutationKind: z.literal("gemini_tool_invocation"),
  /** Gemini tool name / capability id as executed server-side. */
  capability: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  context: ExecutionMutationContextSchema,
  caller: ExecutionMutationCallerSchema,
});

export const ExecutionMutationRequestSchema = GeminiToolInvocationSchema;

export type ExecutionMutationRequest = z.infer<typeof ExecutionMutationRequestSchema>;
export type ExecutionMutationCaller = z.infer<typeof ExecutionMutationCallerSchema>;
export type ExecutionMutationContext = z.infer<typeof ExecutionMutationContextSchema>;

export function parseExecutionMutationRequest(
  raw: unknown,
): z.SafeParseReturnType<unknown, ExecutionMutationRequest> {
  return ExecutionMutationRequestSchema.safeParse(raw);
}

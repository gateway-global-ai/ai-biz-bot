/**
 * Canvas Payload Schemas — Gateway Global AI OS
 *
 * Zod runtime validation for all 5 CanvasSyscallEnvelope payload types.
 * These schemas are the "Review Gate" — if an AI hallucinates a property
 * or the client sends a malformed payload, the system rejects it with
 * INVALID_SCHEMA before it can corrupt UI state.
 *
 * Wired into canvasDirectiveValidator.ts Layer 5.
 * Architecture: canvas_control.md §8, SYSTEM_MANIFEST.md — Directive Enforcement Rule
 */

import { z } from 'zod';

// ── Shared primitives ─────────────────────────────────────────────────────────

const renderModeSchema = z.enum(['replace', 'patch', 'noop', 'disambiguate']);

const recentTurnSchema = z.object({
  transcript: z.string(),
  selectedIntent: z.string().optional(),
  currentViewId: z.string().optional(),
  turnId: z.string().optional(),
});

// ── §8.1 canvas.resolve payload ───────────────────────────────────────────────

export const canvasResolvePayloadSchema = z.object({
  transcript: z.string().min(1),
  recentTurns: z.array(recentTurnSchema).max(5).optional(),
  currentCanvasSummary: z.string().optional(),
  requestedSkillHint: z.string().optional(),
});

// ── §8.2 canvas.render view model schemas ─────────────────────────────────────

const intentOptionSchema = z.object({
  label: z.string(),
  viewId: z.string(),
  icon: z.string().optional(),
});

const serviceMenuItemSchema = z.object({
  name: z.string(),
  price: z.string().optional(),
  duration: z.string().optional(),
  description: z.string().optional(),
});

const faqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const taskOrderItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean(),
  status: z.enum(['pending', 'complete']).optional(),
});

const agentRosterItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  roleType: z.string(),
  status: z.enum(['active', 'paused', 'inactive']),
  model: z.string().optional(),
  lastRun: z.string().optional(),
  knowledgeCount: z.number().optional(),
});

const supportTopicSchema = z.object({
  label: z.string(),
  description: z.string(),
  action: z.string(),
});

const disambiguationOptionSchema = z.object({
  label: z.string(),
  intent: z.string(),
  viewId: z.string(),
});

const knowledgeArtifactSchema = z.object({
  id: z.string(),
  title: z.string(),
  addedAt: z.string().optional(),
});

const aptitudeResultSchema = z.object({
  question: z.string(),
  expected: z.string(),
  actual: z.string(),
  passed: z.boolean(),
});

const dynamicViewModelSchema = z.object({
  componentType: z.string(),
  props: z.record(z.unknown()),
  actions: z
    .array(
      z.object({
        actionId: z.string(),
        label: z.string(),
        style: z.enum(['primary', 'secondary', 'danger']).optional(),
      }),
    )
    .optional(),
});

/** Discriminated union — viewId gates the accepted data shape */
export const canvasRenderPayloadSchema = z.discriminatedUnion('viewId', [
  z.object({
    viewId: z.literal('welcome'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      greeting: z.string(),
      intentOptions: z.array(intentOptionSchema),
    }),
  }),
  z.object({
    viewId: z.literal('service_menu'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      title: z.string(),
      items: z.array(serviceMenuItemSchema),
      cta: z.object({ label: z.string(), action: z.string() }).optional(),
    }),
  }),
  z.object({
    viewId: z.literal('faq_list'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      title: z.string(),
      faqs: z.array(faqItemSchema),
    }),
  }),
  z.object({
    viewId: z.literal('intake_checklist'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      title: z.string(),
      steps: z.array(taskOrderItemSchema),
    }),
  }),
  z.object({
    viewId: z.literal('workspace_provisioning_form'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      title: z.string(),
      steps: z.array(taskOrderItemSchema),
    }),
  }),
  z.object({
    viewId: z.literal('agent_roster'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      agents: z.array(agentRosterItemSchema),
    }),
  }),
  z.object({
    viewId: z.literal('knowledge_library_builder'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      agentId: z.string(),
      agentName: z.string(),
      existingArtifacts: z.array(knowledgeArtifactSchema),
    }),
  }),
  z.object({
    viewId: z.literal('aptitude_test_runner'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      agentId: z.string(),
      agentName: z.string(),
      results: z.array(aptitudeResultSchema).optional(),
    }),
  }),
  z.object({
    viewId: z.literal('support_home'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      topics: z.array(supportTopicSchema),
    }),
  }),
  z.object({
    viewId: z.literal('disambiguation_menu'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      question: z.string(),
      options: z.array(disambiguationOptionSchema),
    }),
  }),
  z.object({
    viewId: z.literal('command_center'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      headline: z.string(),
      contextSummary: z.string().optional(),
      statusItems: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          value: z.string(),
          tone: z.enum(['neutral', 'success', 'warning', 'danger']).optional(),
        }),
      ),
      workItems: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          subtitle: z.string().optional(),
        }),
      ),
      approvals: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            actionId: z.string(),
          }),
        )
        .optional(),
    }),
  }),
  z.object({
    viewId: z.literal('canvas_backgrounds'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      helperText: z.string().optional(),
    }),
  }),
  z.object({
    viewId: z.literal('account_overview'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      plan: z.string(),
      businesses: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
          businessAddress: z.string().optional(),
        }),
      ),
      billingCta: z.object({ label: z.string(), url: z.string() }).optional(),
    }),
  }),
  z.object({
    viewId: z.literal('identity_verify'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      siteConfigId: z.string(),
      verificationMethod: z.enum(['otp', 'magic_link']),
    }),
  }),
  z.object({
    viewId: z.literal('phone_provisioning_form'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: z.object({
      siteConfigId: z.string(),
      suggestedAreaCode: z.string().optional(),
      availableNumbers: z
        .array(
          z.object({
            phoneNumber: z.string(),
            friendlyName: z.string(),
            locality: z.string(),
          }),
        )
        .optional(),
      currentNumber: z.string().optional(),
      voicePlanActive: z.boolean(),
    }),
  }),
  z.object({
    viewId: z.literal('agent_builder_form'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: dynamicViewModelSchema,
  }),
  z.object({
    viewId: z.literal('dynamic'),
    renderMode: renderModeSchema,
    title: z.string(),
    data: dynamicViewModelSchema,
  }),
  // Legacy views — retain backward compat with dynamic data shape
  z.object({ viewId: z.literal('schedule'),         renderMode: renderModeSchema, title: z.string(), data: dynamicViewModelSchema }),
  z.object({ viewId: z.literal('pricing_table'),    renderMode: renderModeSchema, title: z.string(), data: dynamicViewModelSchema }),
  z.object({ viewId: z.literal('business_summary'), renderMode: renderModeSchema, title: z.string(), data: dynamicViewModelSchema }),
  z.object({ viewId: z.literal('custom_card'),      renderMode: renderModeSchema, title: z.string(), data: dynamicViewModelSchema }),
]);

// ── §8.3 canvas.patch payload ─────────────────────────────────────────────────

const canvasPatchOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('replace_field'), path: z.string(), value: z.unknown() }),
  z.object({ op: z.literal('append_items'), path: z.string(), items: z.array(z.unknown()) }),
  z.object({ op: z.literal('remove_item'), path: z.string(), key: z.string() }),
  z.object({ op: z.literal('set_loading'), path: z.string(), value: z.boolean() }),
  z.object({ op: z.literal('set_error'), path: z.string(), message: z.string() }),
  z.object({
    op: z.literal('reorder_slots'),
    path: z.string(),
    orderedKeys: z.array(z.string().min(1).max(128)).min(1).max(64),
  }),
  z.object({
    op: z.literal('replace_component'),
    slotId: z.string().min(1).max(128),
    componentType: z.string().min(1).max(128),
    props: z.record(z.unknown()).optional(),
  }),
  z.object({
    op: z.literal('patch_props'),
    path: z.string(),
    props: z.record(z.unknown()),
  }),
]);

export const canvasPatchPayloadSchema = z.object({
  patchContractVersion: z.literal('1.0').optional(),
  targetViewId: z.string(),
  patchOps: z.array(canvasPatchOpSchema).min(1).max(20),
});

// ── §8.4 canvas.clear payload ─────────────────────────────────────────────────

export const canvasClearPayloadSchema = z.object({
  reason: z.enum(['session_end', 'security_change', 'timeout', 'dismiss', 'reset', 'error_recovery']),
  fallbackViewId: z.literal('welcome').optional(),
});

// ── §8.5 canvas.action payload ────────────────────────────────────────────────

export const canvasActionPayloadSchema = z.object({
  actionContractVersion: z.literal('1.0').optional(),
  actionId: z.string().min(1),
  actionType: z.enum([
    'open_view', 'submit_form', 'trigger_skill', 'escalate',
    'open_route', 'call', 'text', 'email', 'website',
  ]),
  actionData: z.record(z.unknown()).optional(),
});

// ── Syscall-to-schema dispatch map ────────────────────────────────────────────

import type { CanvasSyscallType } from '../../shared/canvasViewContract';

const PAYLOAD_SCHEMA_MAP = {
  'canvas.resolve': canvasResolvePayloadSchema,
  'canvas.render':  canvasRenderPayloadSchema,
  'canvas.patch':   canvasPatchPayloadSchema,
  'canvas.clear':   canvasClearPayloadSchema,
  'canvas.action':  canvasActionPayloadSchema,
} as const;

/**
 * Validate the raw payload for the given syscall type.
 * Returns { success: true } or { success: false, error: ZodError message }.
 */
export function validateSyscallPayload(
  syscall: CanvasSyscallType,
  payload: unknown,
): { success: true } | { success: false; error: string } {
  const schema = PAYLOAD_SCHEMA_MAP[syscall];
  if (!schema) {
    return { success: false, error: `No schema registered for syscall '${syscall}'` };
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    };
  }
  return { success: true };
}

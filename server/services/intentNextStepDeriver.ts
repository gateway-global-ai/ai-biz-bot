/**
 * Intent Next-Step Deriver — Gateway Global AI OS
 *
 * Derives an IntentNextStepPacket from real resolve results and data source capabilities.
 * The packet reflects reality: actual result counts, actual API parameters, actual sort capabilities.
 * It does NOT prescribe UI or preset thresholds.
 *
 * Canonical: docs-governance/canonical/INTENT_NEXT_STEP_PACKET_SPEC_V1.md
 */

import type {
  CanvasResolveResult,
  IntentNextStepPacket,
  IntentNextStepFilter,
  IntentNextStepReduction,
  IntentNextStepViewOption,
  IntentActionMode,
} from '../../shared/canvasViewContract';
import type { IntentLoopResolution } from '../../shared/intentLoopContract';

export interface QueryResultMeta {
  dataSource: string;
  resultCount: number;
  resultSummary: string;
  queryParams: Record<string, unknown>;
  appliedFilters: Record<string, unknown>;
  executionMs?: number;
  availableFilters?: IntentNextStepFilter[];
  availableReductions?: IntentNextStepReduction[];
  availableViewOptions?: IntentNextStepViewOption[];
}

function deriveActionMode(
  resolveResult: CanvasResolveResult,
  resolution: IntentLoopResolution | undefined,
  queryMeta: QueryResultMeta | undefined,
): IntentActionMode {
  if (resolution?.auditNotes?.some(n => String(n).includes('security_gate'))) {
    return 'need_auth';
  }

  if (resolveResult.renderMode === 'noop' && !resolveResult.selectedViewId) {
    return 'direct_execute';
  }

  if (queryMeta && queryMeta.resultCount > 0 && queryMeta.availableFilters && queryMeta.availableFilters.length > 0) {
    return 'need_grounding';
  }

  if (resolveResult.selectedViewId) {
    return 'open_canvas';
  }

  return 'direct_execute';
}

function buildPromptToUser(
  actionMode: IntentActionMode,
  queryMeta: QueryResultMeta | undefined,
  resolveResult: CanvasResolveResult,
): string {
  if (queryMeta && actionMode === 'need_grounding') {
    const parts: string[] = [`I found ${queryMeta.resultCount} results.`];

    if (queryMeta.resultSummary) {
      parts[0] = queryMeta.resultSummary + '.';
    }

    const filterLabels = queryMeta.availableFilters?.map(f => f.label.toLowerCase()) ?? [];
    if (filterLabels.length > 0) {
      parts.push(`We can narrow by ${filterLabels.slice(0, 3).join(', ')}.`);
    }

    const reductionLabels = queryMeta.availableReductions?.map(r => r.label.toLowerCase()) ?? [];
    if (reductionLabels.length > 0) {
      parts.push(`I can also pick the ${reductionLabels.slice(0, 2).join(' or ')}.`);
    }

    const viewLabels = queryMeta.availableViewOptions?.filter(v => !v.recommended).map(v => v.label.toLowerCase()) ?? [];
    if (viewLabels.length > 1) {
      parts.push(`When ready, I can show results as ${viewLabels.join(', ')}.`);
    }

    parts.push('What would you like to do?');
    return parts.join(' ');
  }

  if (queryMeta && queryMeta.resultCount > 0) {
    return queryMeta.resultSummary || `Found ${queryMeta.resultCount} results.`;
  }

  return resolveResult.speechContext?.speakingInstructions ?? 'How would you like to proceed?';
}

export function deriveNextStepPacket(
  resolveResult: CanvasResolveResult,
  resolution: IntentLoopResolution | undefined,
  queryMeta?: QueryResultMeta,
): IntentNextStepPacket | null {
  if (resolveResult.renderMode === 'noop' && !resolveResult.selectedViewId && !queryMeta) {
    return null;
  }

  const actionMode = deriveActionMode(resolveResult, resolution, queryMeta);

  const packet: IntentNextStepPacket = {
    intentId: resolveResult.selectedViewId ?? 'unknown',
    confidence: resolveResult.intentRouterTier === 1 ? 0.95
      : resolveResult.intentRouterTier === 2 ? 0.75
      : 0.5,
    actionMode,
    resultCount: queryMeta?.resultCount ?? 0,
    resultSummary: queryMeta?.resultSummary ?? resolveResult.speechContext?.screenSummary ?? '',
    promptToUser: '',
  };

  if (queryMeta?.availableFilters && queryMeta.availableFilters.length > 0) {
    packet.filters = queryMeta.availableFilters;
  }

  if (queryMeta?.availableReductions && queryMeta.availableReductions.length > 0) {
    packet.reductions = queryMeta.availableReductions;
  }

  if (queryMeta?.availableViewOptions && queryMeta.availableViewOptions.length > 0) {
    packet.viewOptions = queryMeta.availableViewOptions;
  }

  if (queryMeta) {
    packet.queryContext = {
      dataSource: queryMeta.dataSource,
      queryParams: queryMeta.queryParams,
      appliedFilters: queryMeta.appliedFilters,
      executionMs: queryMeta.executionMs,
    };
  }

  packet.promptToUser = buildPromptToUser(actionMode, queryMeta, resolveResult);

  return packet;
}

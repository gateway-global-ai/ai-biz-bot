/**
 * Sovereign UI — governed component library (Tailwind + shadcn/ui).
 * Import from `@/ui-core` — never import MUI or shadcn primitives directly in feature code.
 */

// ── Components ──────────────────────────────────────────────────────
export { SovereignButton } from './components/SovereignButton';
export type { SovereignButtonProps, SovereignButtonVariant } from './components/SovereignButton';

export { SovereignCard } from './components/SovereignCard';
export type { SovereignCardProps, SovereignCardVariant } from './components/SovereignCard';

export { SovereignBadge } from './components/SovereignBadge';
export type { SovereignBadgeProps, SovereignBadgeVariant } from './components/SovereignBadge';

export { SovereignInput } from './components/SovereignInput';
export type { SovereignInputProps } from './components/SovereignInput';

export { SovereignSelect } from './components/SovereignSelect';
export type { SovereignSelectProps, SovereignSelectOption } from './components/SovereignSelect';

export { SovereignAlert } from './components/SovereignAlert';
export type { SovereignAlertProps, SovereignAlertVariant } from './components/SovereignAlert';

export { SovereignModal } from './components/SovereignModal';
export type { SovereignModalProps } from './components/SovereignModal';

export { SovereignTabs } from './components/SovereignTabs';
export type { SovereignTabsProps, SovereignTab } from './components/SovereignTabs';

export { SovereignDataTable } from './components/SovereignDataTable';
export type {
  SovereignDataTableProps,
  SovereignDataTableColumn,
} from './components/SovereignDataTable';

// ── MUI-based components (marked for future Tailwind rewrite) ───────
export { SovereignStack } from './components/SovereignStack';
export type { SovereignStackProps } from './components/SovereignStack';

export { SovereignTypography } from './components/SovereignTypography';
export type { SovereignTypographyProps } from './components/SovereignTypography';

export { SovereignFormField } from './components/SovereignFormField';
export type { SovereignFormFieldProps } from './components/SovereignFormField';

// ── Layouts ─────────────────────────────────────────────────────────
export { SovereignPageShell } from './layouts/SovereignPageShell';
export type { SovereignPageShellProps } from './layouts/SovereignPageShell';

export { SovereignSectionHeader } from './layouts/SovereignSectionHeader';
export type { SovereignSectionHeaderProps } from './layouts/SovereignSectionHeader';

export { SovereignFormLayout } from './layouts/SovereignFormLayout';
export type { SovereignFormLayoutProps } from './layouts/SovereignFormLayout';

export { SovereignOverlayLayout } from './layouts/SovereignOverlayLayout';
export type { SovereignOverlayLayoutProps } from './layouts/SovereignOverlayLayout';

export { SovereignInspectorLayout } from './layouts/SovereignInspectorLayout';
export type { SovereignInspectorLayoutProps } from './layouts/SovereignInspectorLayout';

// ── Feedback ────────────────────────────────────────────────────────
export { SovereignEmptyState } from './feedback/SovereignEmptyState';
export type { SovereignEmptyStateProps } from './feedback/SovereignEmptyState';

export { SovereignLoadingState } from './feedback/SovereignLoadingState';
export type { SovereignLoadingStateProps } from './feedback/SovereignLoadingState';

export { SovereignStatusDot } from './feedback/SovereignStatusDot';
export type { SovereignStatusDotProps } from './feedback/SovereignStatusDot';

export { SovereignViolationBanner } from './feedback/SovereignViolationBanner';
export type { SovereignViolationBannerProps } from './feedback/SovereignViolationBanner';

// ── Navigation ──────────────────────────────────────────────────────
export { SovereignMenuCategory } from './navigation/SovereignMenuCategory';
export type { SovereignMenuCategoryProps, SovereignMenuItem } from './navigation/SovereignMenuCategory';

export { SovereignCommandNav } from './navigation/SovereignCommandNav';
export type { SovereignCommandNavProps, SovereignCommandNavItem } from './navigation/SovereignCommandNav';

// ── Theme ──────────────────────────────────────────────────────────
export { SovereignThemeProvider } from './theme/SovereignThemeProvider';

// ── Tokens ──────────────────────────────────────────────────────────
export * from './tokens/designTokens';
export * from './tokens/componentTokens';
export * from './tokens/motionTokens';

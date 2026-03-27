/**
 * Sovereign UI — governed import surface for admin/control-plane MUI primitives.
 * Do not import @mui/* from feature pages; import from `@/ui-core` instead.
 */

export { SovereignThemeProvider } from "./theme/SovereignThemeProvider";
export { createSovereignAdminTheme } from "./theme/sovereignMuiTheme";

export { SovereignButton } from "./components/SovereignButton";
export type { SovereignButtonProps, SovereignButtonVariant } from "./components/SovereignButton";

export { SovereignCard } from "./components/SovereignCard";
export type { SovereignCardProps } from "./components/SovereignCard";

export { SovereignModal } from "./components/SovereignModal";
export type { SovereignModalProps } from "./components/SovereignModal";

export { SovereignFormField } from "./components/SovereignFormField";
export type { SovereignFormFieldProps } from "./components/SovereignFormField";

export { SovereignSelect } from "./components/SovereignSelect";
export type { SovereignSelectProps, SovereignSelectOption } from "./components/SovereignSelect";

export { SovereignAlert } from "./components/SovereignAlert";
export type { SovereignAlertProps } from "./components/SovereignAlert";

export { SovereignPageShell } from "./layouts/SovereignPageShell";
export type { SovereignPageShellProps } from "./layouts/SovereignPageShell";

export { SovereignSectionHeader } from "./layouts/SovereignSectionHeader";
export type { SovereignSectionHeaderProps } from "./layouts/SovereignSectionHeader";

export { SovereignStack } from "./components/SovereignStack";
export type { SovereignStackProps } from "./components/SovereignStack";

export { SovereignTypography } from "./components/SovereignTypography";
export type { SovereignTypographyProps } from "./components/SovereignTypography";

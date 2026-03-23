import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Platform button — wraps shadcn `Button` for consistent imports under `@/ui/foundation`.
 * Prefer this over `@/components/ui/button` in new product code.
 */
export const UIButton = forwardRef<HTMLButtonElement, ButtonProps>(function UIButton(
  props,
  ref,
) {
  return <Button ref={ref} {...props} />;
});
UIButton.displayName = "UIButton";

export type { ButtonProps as UIButtonProps } from "@/components/ui/button";

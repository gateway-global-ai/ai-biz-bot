import Dialog, { type DialogProps } from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import type { ReactNode } from "react";
import { SovereignButton } from "./SovereignButton";

export type SovereignModalProps = Omit<DialogProps, "children"> & {
  title: string;
  children: ReactNode;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
};

export function SovereignModal({
  title,
  children,
  primaryAction,
  secondaryAction,
  onClose,
  ...dialogProps
}: SovereignModalProps) {
  return (
    <Dialog onClose={onClose} maxWidth="sm" fullWidth {...dialogProps}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {(primaryAction || secondaryAction) && (
        <DialogActions>
          {secondaryAction ? (
            <SovereignButton sovereignVariant="text" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </SovereignButton>
          ) : null}
          {primaryAction ? (
            <SovereignButton sovereignVariant="primary" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </SovereignButton>
          ) : null}
        </DialogActions>
      )}
    </Dialog>
  );
}

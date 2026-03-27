import Box, { type BoxProps } from "@mui/material/Box";
import type { ReactNode } from "react";

export type SovereignPageShellProps = BoxProps & {
  children: ReactNode;
};

/** Content width + padding for admin pages inside existing dark chrome. */
export function SovereignPageShell({ children, sx, ...rest }: SovereignPageShellProps) {
  return (
    <Box
      component="main"
      sx={{
        p: 3,
        maxWidth: 1200,
        mx: "auto",
        width: "100%",
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

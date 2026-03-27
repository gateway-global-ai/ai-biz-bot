import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { createSovereignAdminTheme } from "./sovereignMuiTheme";

const sovereignAdminTheme = createSovereignAdminTheme();

type Props = { children: ReactNode };

/** Scoped MUI theme for admin/control-plane surfaces. No CssBaseline — avoids global resets. */
export function SovereignThemeProvider({ children }: Props) {
  return <ThemeProvider theme={sovereignAdminTheme}>{children}</ThemeProvider>;
}

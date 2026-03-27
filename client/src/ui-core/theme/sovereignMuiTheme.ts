import { createTheme } from "@mui/material/styles";
import { BRAND, SHELL } from "@/config/brand";

/**
 * Dark admin/control-plane theme mapped from sovereign brand tokens.
 * Does not replace Concierge canvas rules — use only inside SovereignThemeProvider boundaries.
 */
export function createSovereignAdminTheme() {
  return createTheme({
    palette: {
      mode: "dark",
      primary: { main: BRAND.green, contrastText: "#f8fafc" },
      secondary: { main: BRAND.blueLight },
      background: {
        default: "#020617",
        paper: "rgba(15, 23, 42, 0.88)",
      },
      text: {
        primary: SHELL.text,
        secondary: SHELL.textMuted,
      },
      divider: SHELL.border,
      error: { main: "#f87171" },
      warning: { main: "#fbbf24" },
      info: { main: BRAND.blueLight },
      success: { main: BRAND.greenLight },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: { fontWeight: 700 },
      body2: { color: SHELL.textMuted },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${SHELL.border}`,
            backdropFilter: "blur(16px)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none", fontWeight: 600 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
            border: `1px solid ${SHELL.border}`,
          },
        },
      },
    },
  });
}

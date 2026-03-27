import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { SHELL } from "@/config/brand";

export type SovereignSectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function SovereignSectionHeader({
  title,
  subtitle,
  icon,
  action,
}: SovereignSectionHeaderProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      gap={2}
      sx={{ mb: 3 }}
    >
      <Stack direction="row" alignItems="center" gap={1.5}>
        {icon ? (
          <Box
            sx={{
              p: 1,
              borderRadius: 3,
              border: `1px solid ${SHELL.border}`,
              bgcolor: "rgba(15, 23, 42, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Box>
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
    </Stack>
  );
}

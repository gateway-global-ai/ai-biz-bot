import Card, { type CardProps } from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import type { ReactNode } from "react";

export type SovereignCardProps = CardProps & {
  title?: string;
  children: ReactNode;
};

export function SovereignCard({ title, children, ...cardProps }: SovereignCardProps) {
  return (
    <Card {...cardProps}>
      <CardContent>
        <Stack spacing={2}>
          {title ? (
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              {title}
            </Typography>
          ) : null}
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}

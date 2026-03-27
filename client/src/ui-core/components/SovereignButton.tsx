import Button, { type ButtonProps } from "@mui/material/Button";

export type SovereignButtonVariant = "primary" | "secondary" | "outlined" | "text";

export type SovereignButtonProps = Omit<ButtonProps, "variant" | "color"> & {
  sovereignVariant?: SovereignButtonVariant;
};

const variantMap: Record<
  SovereignButtonVariant,
  Pick<ButtonProps, "variant" | "color">
> = {
  primary: { variant: "contained", color: "primary" },
  secondary: { variant: "contained", color: "secondary" },
  outlined: { variant: "outlined", color: "primary" },
  text: { variant: "text", color: "inherit" },
};

export function SovereignButton({
  sovereignVariant = "primary",
  ...props
}: SovereignButtonProps) {
  const mui = variantMap[sovereignVariant];
  return <Button {...mui} {...props} />;
}

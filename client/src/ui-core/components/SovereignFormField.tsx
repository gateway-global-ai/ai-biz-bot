import TextField, { type TextFieldProps } from "@mui/material/TextField";

export type SovereignFormFieldProps = TextFieldProps;

/** Thin wrapper around MUI TextField for consistent admin density and future RHF wiring. */
export function SovereignFormField(props: SovereignFormFieldProps) {
  return <TextField fullWidth size="small" variant="outlined" {...props} />;
}

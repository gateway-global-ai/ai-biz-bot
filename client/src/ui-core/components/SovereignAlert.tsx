import Alert, { type AlertProps } from "@mui/material/Alert";

export type SovereignAlertProps = AlertProps;

export function SovereignAlert(props: SovereignAlertProps) {
  return <Alert variant="outlined" {...props} />;
}

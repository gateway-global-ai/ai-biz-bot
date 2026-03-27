import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

export type SovereignSelectOption = { value: string; label: string };

export type SovereignSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SovereignSelectOption[];
  disabled?: boolean;
  id?: string;
};

export function SovereignSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  id,
}: SovereignSelectProps) {
  const selectId = id ?? `sovereign-select-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const labelId = `${selectId}-label`;

  return (
    <FormControl fullWidth size="small" disabled={disabled}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        id={selectId}
        value={value}
        label={label}
        onChange={(e: SelectChangeEvent) => onChange(String(e.target.value))}
      >
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

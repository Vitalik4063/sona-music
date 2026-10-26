import { cn } from "../utils";

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn("toggle toggle--button", checked && "is-on")}
      onClick={() => onChange(!checked)}
      disabled={disabled}
    >
      <span />
    </button>
  );
}

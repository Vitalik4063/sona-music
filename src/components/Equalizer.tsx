import { cn } from "../utils";

export function Equalizer({ paused = false, className }: { paused?: boolean; className?: string }) {
  return (
    <span className={cn("equalizer", paused && "equalizer--paused", className)} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

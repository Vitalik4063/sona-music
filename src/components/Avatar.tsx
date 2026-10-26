import { useState } from "react";
import { cn, initials } from "../utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}

export function Avatar({ name, src, size = "md", className, ring = false }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn("avatar", `avatar--${size}`, ring && "avatar--ring", className)}>
      {src && !failed ? (
        <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="avatar__initials" aria-hidden="true">
          {initials(name)}
        </span>
      )}
    </span>
  );
}

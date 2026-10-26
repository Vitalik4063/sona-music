import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { cn } from "../utils";

interface EmptyStateProps {
  title: string;
  text: string;
  icon?: ReactNode;
  action?: { label: string; to?: string; onClick?: () => void };
  className?: string;
  compact?: boolean;
}

export function EmptyState({ title, text, icon, action, className, compact }: EmptyStateProps) {
  return (
    <div className={cn("empty-state", compact && "empty-state--compact", className)}>
      <div className="empty-state__visual" aria-hidden="true">
        <span className="empty-state__ring empty-state__ring--one" />
        <span className="empty-state__ring empty-state__ring--two" />
        <span className="empty-state__icon">{icon || <Sparkles size={28} />}</span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action &&
        (action.to ? (
          <Link className="btn btn--primary" to={action.to}>
            {action.label}
          </Link>
        ) : (
          <button className="btn btn--primary" type="button" onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </div>
  );
}

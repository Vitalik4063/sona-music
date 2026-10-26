import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  to?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  to,
  onAction,
  children,
}: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      <div className="section-header__actions">
        {children}
        {actionLabel && to && (
          <Link to={to} className="section-link">
            {actionLabel}
            <ChevronRight size={16} />
          </Link>
        )}
        {actionLabel && onAction && (
          <button type="button" className="section-link" onClick={onAction}>
            {actionLabel}
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

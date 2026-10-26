import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { cn } from "../utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide";
  className?: string;
  hideClose?: boolean;
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "default",
  className,
  hideClose = false,
}: SheetProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className={cn("sheet", size === "wide" && "sheet--wide", className)}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Окно"}
      >
        <div className="sheet__handle" aria-hidden="true" />
        {(title || !hideClose) && (
          <div className="sheet__header">
            <div>
              {title && <h2 className="sheet__title">{title}</h2>}
              {subtitle && <p className="sheet__subtitle">{subtitle}</p>}
            </div>
            {!hideClose && (
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

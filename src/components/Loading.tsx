import { cn } from "../utils";

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("spinner", className)} aria-hidden="true" />;
}

export function LoadingScreen({ label = "Настраиваем твою Sona" }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-screen__mark">
        <span className="loading-screen__ring" />
        <span className="loading-screen__ring loading-screen__ring--two" />
        <span className="loading-screen__dot" />
      </div>
      <p>{label}</p>
      <div className="loading-screen__bar">
        <span />
      </div>
    </div>
  );
}

export function PageSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <div className="page page-skeleton" aria-busy="true" aria-label="Загрузка">
      <div className="skeleton skeleton--eyebrow" />
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--text" />
      <div className="skeleton-grid">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="skeleton-card">
            <div className="skeleton skeleton--art" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line-short" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Что-то пошло не так",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-state">
      <span className="error-state__mark">!</span>
      <h2>{title}</h2>
      <p>{message || "Не удалось загрузить данные. Проверь соединение и попробуй снова."}</p>
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Попробовать снова
        </button>
      )}
    </div>
  );
}

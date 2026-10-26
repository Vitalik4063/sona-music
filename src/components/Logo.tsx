import { Link } from "react-router-dom";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="logo" aria-label="Sona — на главную">
      <span className="logo__mark">
        <svg viewBox="0 0 512 512" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeLinecap="round">
            <path d="M256 84c-64 0-116 52-116 116 0 44 24 82 60 102" strokeWidth="24" opacity=".95" />
            <path d="M256 132c-38 0-68 30-68 68 0 25 13 47 33 59" strokeWidth="20" opacity=".62" />
            <path d="M256 428c64 0 116-52 116-116 0-44-24-82-60-102" strokeWidth="24" opacity=".95" />
            <path d="M256 380c38 0 68-30 68-68 0-25-13-47-33-59" strokeWidth="20" opacity=".62" />
          </g>
          <circle cx="256" cy="256" r="21" fill="currentColor" />
        </svg>
      </span>
      {!compact && <span className="logo__word">sona</span>}
    </Link>
  );
}

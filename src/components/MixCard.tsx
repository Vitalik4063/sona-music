import { Link } from "react-router-dom";
import { ArrowUpRight, Play } from "lucide-react";
import type { Mix } from "../types";
import { usePlayer } from "../state/PlayerContext";
import { accentGradient, cn, trackCount } from "../utils";

const mixLabels: Record<string, string> = {
  daily: "Микс дня",
  evening: "Вечерний",
  focus: "Фокус",
  discovery: "Открытия",
  liked: "Из твоего",
  fresh: "Свежий",
};

export function MixCard({ mix, compact = false }: { mix: Mix; compact?: boolean }) {
  const player = usePlayer();
  const gradient = accentGradient(mix.accent);
  const label = mixLabels[mix.id] || "Подборка";

  return (
    <article
      className={cn("mix-card", compact && "mix-card--compact")}
      style={{ ["--mix-gradient" as string]: gradient }}
    >
      <Link to={`/mix/${mix.id}`} className="mix-card__link" aria-label={mix.title}>
        <div className="mix-card__visual">
          {mix.artwork_url ? (
            <img src={mix.artwork_url} alt="" loading="lazy" />
          ) : (
            <>
              <span className="mix-card__wash" />
              <span className="mix-card__rings" />
              <span className="mix-card__monogram">S</span>
            </>
          )}
          <span className="mix-card__label">{label}</span>
          <span className="mix-card__arrow">
            <ArrowUpRight size={17} />
          </span>
        </div>
        <div className="mix-card__content">
          <h3>{mix.title}</h3>
          <p>{mix.subtitle}</p>
          <span className="mix-card__count">{trackCount(mix.tracks.length)}</span>
        </div>
      </Link>
      <button
        type="button"
        className="mix-card__play"
        onClick={() => player.playQueue(mix.tracks, 0)}
        aria-label={`Слушать подборку «${mix.title}»`}
      >
        <Play size={18} fill="currentColor" />
      </button>
    </article>
  );
}

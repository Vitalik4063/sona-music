import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Play, Share2, Shuffle, Sparkles } from "lucide-react";
import { api } from "../api";
import { usePlayer } from "../state/PlayerContext";
import { useToast } from "../state/ToastContext";
import { shareUniversal } from "../telegram";
import {
  accentGradient,
  formatMinutes,
  shuffleTracks,
  trackCount,
} from "../utils";
import { ErrorState, PageSkeleton } from "../components/Loading";
import { TrackRow } from "../components/TrackRow";

const labels: Record<string, string> = {
  daily: "Микс дня",
  evening: "Вечерний микс",
  focus: "Фокус",
  discovery: "Открытия",
  liked: "Из твоего",
  fresh: "Свежий",
};

export function MixPage() {
  const { id = "" } = useParams();
  const player = usePlayer();
  const { toast } = useToast();
  const { data: mix, isLoading, error, refetch } = useQuery({
    queryKey: ["mix", id],
    queryFn: () => api.mix(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <PageSkeleton />;
  if (error || !mix) {
    return (
      <ErrorState
        title="Подборка не нашлась"
        message={error instanceof Error ? error.message : "Возможно, миксы обновились."}
        onRetry={() => void refetch()}
      />
    );
  }

  const totalMs = mix.tracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0);
  const gradient = accentGradient(mix.accent);
  const shuffle = () => {
    if (!mix.tracks.length) return;
    player.playQueue(shuffleTracks(mix.tracks), 0);
  };

  const share = async () => {
    const url = `${window.location.origin}/mix/${encodeURIComponent(mix.id)}`;
    const res = await shareUniversal({
      url,
      title: `Микс «${mix.title}» в Sona`,
      text: `Слушай микс «${mix.title}» в Sona`,
    });
    toast(res.copied ? "Ссылка на микс скопирована" : "Не удалось скопировать", res.copied ? "success" : "error");
  };

  return (
    <div className="page mix-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        Главная
      </Link>

      <section
        className="mix-hero"
        style={{ ["--mix-gradient" as string]: gradient }}
      >
        <div className="mix-hero__visual">
          <span className="mix-hero__wash" />
          <span className="mix-hero__rings" />
          <span className="mix-hero__letter">S</span>
          <span className="mix-hero__label">{labels[mix.id] || "Подборка"}</span>
          <span className="mix-hero__stamp">sona · mix</span>
        </div>
        <div className="mix-hero__copy">
          <span className="eyebrow">
            <Sparkles size={14} /> Персональный микс
          </span>
          <h1>{mix.title}</h1>
          <p>{mix.subtitle}</p>
          <div className="mix-hero__meta">
            <span>{trackCount(mix.tracks.length)}</span>
            <span className="dot-sep" />
            <span>{formatMinutes(totalMs)}</span>
            <span className="dot-sep" />
            <span>собрано Sona</span>
          </div>
          <div className="mix-hero__actions">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => mix.tracks.length && player.playQueue(mix.tracks, 0)}
              disabled={!mix.tracks.length}
            >
              <Play size={18} fill="currentColor" />
              Слушать микс
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              onClick={shuffle}
              disabled={!mix.tracks.length}
            >
              <Shuffle size={18} />
              Перемешать
            </button>
            <button
              type="button"
              className="action-circle action-circle--on-hero"
              onClick={() => void share()}
              aria-label="Поделиться миксом"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="mix-content">
        <div className="playlist-toolbar">
          <span className="playlist-toolbar__label">
            <Sparkles size={15} />
            {trackCount(mix.tracks.length)}
          </span>
          <Link to="/search" className="section-link">
            Найти ещё музыку
          </Link>
        </div>
        {mix.tracks.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <h3>Микс пока собирается</h3>
            <p>Послушай пару треков — и Sona поймёт, что тебе нравится.</p>
            <Link to="/search" className="btn btn--primary">
              Найти музыку
            </Link>
          </div>
        ) : (
          <div className="track-list">
            {mix.tracks.map((track, index) => (
              <TrackRow key={track.id} track={track} queue={mix.tracks} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

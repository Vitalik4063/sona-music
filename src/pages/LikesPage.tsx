import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Heart, Play, Search, Share2, Shuffle, Sparkles } from "lucide-react";
import { api } from "../api";
import { usePlayer } from "../state/PlayerContext";
import { useToast } from "../state/ToastContext";
import { shareUniversal } from "../telegram";
import { formatMinutes, shuffleTracks, trackCount } from "../utils";
import { Cover, PlaylistArtwork } from "../components/Cover";
import { EmptyState } from "../components/EmptyState";
import { ErrorState, PageSkeleton } from "../components/Loading";
import { TrackRow } from "../components/TrackRow";

export function LikesPage() {
  const player = usePlayer();
  const { toast } = useToast();
  const { data: tracks = [], isLoading, error, refetch } = useQuery({
    queryKey: ["likes"],
    queryFn: api.likes,
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings,
    staleTime: 60_000,
  });

  if (isLoading) return <PageSkeleton />;
  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  const totalMs = tracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0);
  const collage = tracks
    .map((track) => track.artwork_url)
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);

  const share = async () => {
    const shareToken = settings?.share_token || "sona-vvc667";
    const profileUrl = `${window.location.origin}/u/${shareToken}`;
    const res = await shareUniversal({
      url: profileUrl,
      title: "Избранное в Sona",
      text: "Мои любимые треки в музыкальном профиле Sona",
    });
    toast(
      res.copied ? "Ссылка на профиль скопирована" : "Не удалось скопировать",
      res.copied ? "success" : "error",
    );
  };

  const shuffle = () => {
    if (!tracks.length) return;
    player.playQueue(shuffleTracks(tracks), 0);
  };

  return (
    <div className="page likes-page">
      <section className="collection-hero collection-hero--likes">
        <div className="collection-hero__art-wrap">
          {collage.length > 1 ? (
            <PlaylistArtwork
              images={collage}
              seed="Sona liked"
              className="collection-hero__art"
              alt="Избранное"
            />
          ) : collage.length === 1 ? (
            <Cover src={collage[0]} seed="Sona liked" className="collection-hero__art" alt="Избранное" />
          ) : (
            <div className="collection-hero__art collection-hero__heart">
              <span className="collection-hero__rings" />
              <Heart size={72} fill="currentColor" />
            </div>
          )}
          <span className="collection-hero__sticker">твоё</span>
        </div>

        <div className="collection-hero__copy">
          <span className="eyebrow">
            <Heart size={14} fill="currentColor" /> Личная коллекция
          </span>
          <h1>Избранное</h1>
          <p>
            Всё, что зацепило с первого раза. Один список — без алгоритмов и лишних
            слов.
          </p>
          <div className="collection-hero__meta">
            <span>{trackCount(tracks.length)}</span>
            <span className="dot-sep" />
            <span>{formatMinutes(totalMs)}</span>
            <span className="dot-sep" />
            <span>сохранено тобой</span>
          </div>
          <div className="collection-hero__actions">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => tracks.length && player.playQueue(tracks, 0)}
              disabled={!tracks.length}
            >
              <Play size={18} fill="currentColor" />
              Слушать
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              onClick={shuffle}
              disabled={!tracks.length}
            >
              <Shuffle size={18} />
              Перемешать
            </button>
            <button
              type="button"
              className="action-circle action-circle--on-hero"
              onClick={() => void share()}
              aria-label="Поделиться избранным"
            >
              <Share2 size={19} />
            </button>
          </div>
        </div>
        <span className="collection-hero__index" aria-hidden="true">
          01
        </span>
      </section>

      {tracks.length === 0 ? (
        <EmptyState
          title="Здесь пока пусто"
          text="Нажимай на сердечко у трека — он появится в избранном и в твоём музыкальном профиле."
          icon={<Heart size={27} />}
          action={{ label: "Найти музыку", to: "/search" }}
        />
      ) : (
        <section className="likes-content">
          <div className="likes-toolbar">
            <span className="likes-toolbar__label">
              <Sparkles size={15} /> Треки в порядке добавления
            </span>
            <Link to="/search" className="section-link">
              <Search size={15} />
              Добавить ещё
            </Link>
          </div>
          <div className="track-list">
            {tracks.map((track, index) => (
              <TrackRow key={track.id} track={track} queue={tracks} index={index} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

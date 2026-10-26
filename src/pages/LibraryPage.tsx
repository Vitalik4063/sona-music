import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Clock3,
  Disc3,
  Grid2X2,
  Heart,
  Link2,
  ListFilter,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { api } from "../api";
import { usePlayer } from "../state/PlayerContext";
import { useUI } from "../state/UIContext";
import {
  cn,
  formatMinutes,
  playlistCount,
  shuffleTracks,
  trackCount,
} from "../utils";
import { EmptyState } from "../components/EmptyState";
import { ErrorState, PageSkeleton } from "../components/Loading";
import { PlaylistCard } from "../components/PlaylistCard";
import { TrackTile } from "../components/TrackTile";

type Filter = "all" | "public" | "hidden";

export function LibraryPage() {
  const { openCreatePlaylist } = useUI();
  const player = usePlayer();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const homeQuery = useQuery({ queryKey: ["home"], queryFn: api.home });
  const likesQuery = useQuery({ queryKey: ["likes"], queryFn: api.likes });
  const playlistsQuery = useQuery({
    queryKey: ["playlists"],
    queryFn: api.playlists,
  });

  if (homeQuery.isLoading || playlistsQuery.isLoading) return <PageSkeleton />;
  if (homeQuery.error || playlistsQuery.error) {
    return (
      <ErrorState
        onRetry={() => {
          void homeQuery.refetch();
          void playlistsQuery.refetch();
        }}
      />
    );
  }

  const home = homeQuery.data;
  const playlists = playlistsQuery.data || [];
  const likes = likesQuery.data || [];
  const filtered = playlists.filter((playlist) => {
    if (filter === "public" && !playlist.is_public) return false;
    if (filter === "hidden" && playlist.is_public) return false;
    if (deferredQuery && !playlist.title.toLowerCase().includes(deferredQuery)) {
      return false;
    }
    return true;
  });
  const totalDuration = playlists.reduce(
    (sum, playlist) => sum + playlist.total_duration_ms,
    0,
  );
  const publicCount = playlists.filter((playlist) => playlist.is_public).length;

  const playShuffledLikes = () => {
    if (!likes.length) return;
    player.playQueue(shuffleTracks(likes), 0);
  };

  return (
    <div className="page library-page">
      <header className="page-heading library-heading">
        <div>
          <span className="eyebrow">
            <Grid2X2 size={14} /> Твоя коллекция
          </span>
          <h1>Всё, что ты собрал</h1>
          <p>
            {playlistCount(playlists.length)} · {trackCount(home?.stats.tracks ?? 0)} ·{" "}
            {formatMinutes(totalDuration)} музыки
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link to="/import" className="btn btn--ghost">
            <Link2 size={17} />
            Импорт по ссылке
          </Link>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => openCreatePlaylist()}
          >
            <Plus size={18} />
            Новый плейлист
          </button>
        </div>
      </header>

      <div className="library-stats">
        <button
          type="button"
          className="library-stat library-stat--liked"
          onClick={() => likes.length && player.playQueue(likes, 0)}
          disabled={!likes.length}
        >
          <span className="library-stat__icon">
            <Heart size={22} fill="currentColor" />
          </span>
          <span>
            <strong>Избранное</strong>
            <small>{trackCount(likes.length || home?.liked_count || 0)}</small>
          </span>
          <span className="library-stat__arrow">→</span>
        </button>
        <button
          type="button"
          className="library-stat library-stat--ghost"
          onClick={() => {
            if (home?.recent.length) player.playQueue(home.recent, 0);
          }}
          disabled={!home?.recent.length}
        >
          <span className="library-stat__icon">
            <Clock3 size={21} />
          </span>
          <span>
            <strong>История</strong>
            <small>{trackCount(home?.recent.length ?? 0)} недавних</small>
          </span>
          <span className="library-stat__arrow">→</span>
        </button>
        <button
          type="button"
          className="library-stat library-stat--ghost"
          onClick={playShuffledLikes}
          disabled={!likes.length}
        >
          <span className="library-stat__icon">
            <Disc3 size={21} />
          </span>
          <span>
            <strong>Перемешать всё</strong>
            <small>избранное в случайном порядке</small>
          </span>
          <span className="library-stat__arrow">→</span>
        </button>
      </div>

      <div className="library-toolbar">
        <div className="filter-tabs" role="tablist" aria-label="Фильтр плейлистов">
          {(
            [
              ["all", "Все", playlists.length],
              ["public", "Публичные", publicCount],
              ["hidden", "Скрытые", playlists.length - publicCount],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={cn("filter-tab", filter === value && "is-active")}
              onClick={() => setFilter(value)}
            >
              {label}
              <span>{count}</span>
            </button>
          ))}
        </div>
        <label className="inline-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти плейлист"
            aria-label="Найти плейлист"
          />
        </label>
      </div>

      {playlists.length === 0 ? (
        <EmptyState
          title="Коллекция ждёт первого трека"
          text="Создай плейлист или добавь понравившуюся песню в избранное — всё соберётся здесь."
          icon={<Sparkles size={27} />}
          action={{ label: "Создать плейлист", onClick: () => openCreatePlaylist() }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Плейлистов не нашлось"
          text="Попробуй другой фильтр или измени поисковый запрос."
          icon={<ListFilter size={26} />}
          action={{ label: "Показать все", onClick: () => { setFilter("all"); setQuery(""); } }}
          compact
        />
      ) : (
        <div className="playlist-grid">
          {filtered.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
          <button
            type="button"
            className="playlist-card playlist-card--create"
            onClick={() => openCreatePlaylist()}
          >
            <span className="playlist-create__art">
              <span className="playlist-create__plus">+</span>
              <span className="playlist-create__rings" aria-hidden="true" />
            </span>
            <span className="playlist-card__title">Новый плейлист</span>
            <span className="playlist-card__meta">Собрать свою историю</span>
          </button>
        </div>
      )}

      {home && home.recent.length > 0 && (
        <section className="home-section library-recent">
          <div className="section-header">
            <div>
              <h2 className="section-title">Недавно слушали</h2>
              <p className="section-subtitle">Треки, к которым стоит вернуться</p>
            </div>
            <button
              type="button"
              className="section-link"
              onClick={() => player.playQueue(home.recent, 0)}
            >
              Слушать всё
            </button>
          </div>
          <div className="tile-row">
            {home.recent.slice(0, 6).map((track) => (
              <TrackTile key={track.id} track={track} queue={home.recent} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

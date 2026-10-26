import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Globe2,
  Lock,
  Play,
  Share2,
  Shuffle,
  Sparkles,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";
import { usePlayer } from "../state/PlayerContext";
import { useToast } from "../state/ToastContext";
import { shareUniversal } from "../telegram";
import { formatMinutes, gradientFor, shuffleTracks, trackCount } from "../utils";
import { Avatar } from "../components/Avatar";
import { PlaylistArtwork } from "../components/Cover";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/Loading";
import { TrackRow } from "../components/TrackRow";

export function PublicPlaylistPage() {
  const { token = "", playlistId = "" } = useParams();
  const id = Number(playlistId);
  const player = usePlayer();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { loading: authLoading, user: viewer } = useAuth();
  const [copying, setCopying] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-playlist", token, id, viewer?.id ?? "anonymous"],
    queryFn: () => api.publicPlaylist(token, id),
    enabled: Boolean(token) && Number.isFinite(id) && !authLoading,
  });

  if (authLoading || isLoading) return <PageSkeleton />;
  if (error || !data) {
    return (
      <div className="locked-profile">
        <div className="locked-profile__icon">
          <Lock size={30} />
        </div>
        <span className="eyebrow">Плейлист недоступен</span>
        <h2>Эта подборка скрыта.</h2>
        <p>
          {error instanceof Error
            ? error.message
            : "Возможно, владелец закрыл доступ или ссылка устарела."}
        </p>
        <Link to={`/u/${token}`} className="btn btn--primary">
          <ArrowLeft size={16} />
          К профилю
        </Link>
      </div>
    );
  }

  const { playlist, can_copy: canCopy } = data;
  const totalMs = playlist.tracks.reduce((sum, track) => sum + track.duration_ms, 0);
  const shareUrl = `${window.location.origin}/u/${token}/p/${playlist.id}`;

  const share = async () => {
    const res = await shareUniversal({
      url: shareUrl,
      title: `Плейлист «${playlist.title}» в Sona`,
      text: `Плейлист «${playlist.title}» в Sona`,
    });
    toast(res.copied ? "Ссылка на плейлист скопирована" : "Не удалось скопировать", res.copied ? "success" : "error");
  };

  const copyPlaylist = async () => {
    if (copying) return;
    setCopying(true);
    try {
      const result = await api.copyPublicPlaylist(token, playlist.id);
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      toast("Плейлист сохранён в твою коллекцию", "success");
      navigate(`/playlist/${result.playlist.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не удалось сохранить плейлист", "error");
    } finally {
      setCopying(false);
    }
  };

  const shuffle = () => {
    if (!playlist.tracks.length) return;
    player.playQueue(shuffleTracks(playlist.tracks), 0);
  };

  return (
    <div className="public-playlist">
      <Link to={`/u/${token}`} className="back-link">
        <ArrowLeft size={16} />
        {playlist.owner?.display_name || "Профиль"}
      </Link>

      <section
        className="playlist-hero playlist-hero--public"
        style={{ ["--hero-gradient" as string]: gradientFor(playlist.title) }}
      >
        <div className="playlist-hero__art-wrap">
          <PlaylistArtwork
            images={playlist.collage}
            cover={playlist.cover_url}
            seed={playlist.title}
            className="playlist-hero__art"
            alt={playlist.title}
          />
          <span className="playlist-hero__sticker">{playlist.is_public ? "public" : "link"}</span>
        </div>
        <div className="playlist-hero__copy">
          <span className="eyebrow">
            {playlist.is_public ? <Globe2 size={14} /> : <Lock size={14} />}
            Плейлист из профиля
          </span>
          <h1>{playlist.title}</h1>
          {playlist.description && <p>{playlist.description}</p>}
          {playlist.owner && (
            <Link to={`/u/${token}`} className="playlist-owner">
              <Avatar
                name={playlist.owner.display_name}
                src={playlist.owner.photo_url}
                size="sm"
              />
              <span>
                <small>собрал(а)</small>
                <strong>{playlist.owner.display_name}</strong>
              </span>
              <ArrowUpRight size={14} />
            </Link>
          )}
          <div className="playlist-hero__meta">
            <span>{trackCount(playlist.track_count)}</span>
            <span className="dot-sep" />
            <span>{formatMinutes(totalMs || playlist.total_duration_ms)}</span>
          </div>
          <div className="playlist-hero__actions">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => playlist.tracks.length && player.playQueue(playlist.tracks, 0)}
              disabled={!playlist.tracks.length}
            >
              <Play size={18} fill="currentColor" />
              Слушать
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              onClick={shuffle}
              disabled={!playlist.tracks.length}
            >
              <Shuffle size={18} />
              Перемешать
            </button>
            <button
              type="button"
              className="action-circle action-circle--on-hero"
              onClick={() => void share()}
              aria-label="Поделиться"
            >
              <Share2 size={18} />
            </button>
            {canCopy && (
              <button
                type="button"
                className="btn btn--ghost btn--lg playlist-hero__copy"
                onClick={() => void copyPlaylist()}
                disabled={copying}
              >
                {copying ? <Check size={17} /> : <Copy size={17} />}
                {copying ? "Сохраняем…" : "Сохранить себе"}
              </button>
            )}
          </div>
        </div>
        <span className="playlist-hero__count" aria-hidden="true">
          {String(playlist.track_count).padStart(2, "0")}
        </span>
      </section>

      {playlist.tracks.length === 0 ? (
        <EmptyState
          title="Плейлист пока пуст"
          text="Владелец ещё не добавил треки. Загляни в другой плейлист."
          icon={<Sparkles size={26} />}
          action={{ label: "К профилю", to: `/u/${token}` }}
        />
      ) : (
        <section className="playlist-content">
          <div className="playlist-toolbar">
            <span className="playlist-toolbar__label">
              <Sparkles size={15} /> Треки в плейлисте
            </span>
            {canCopy && (
              <button type="button" className="section-link" onClick={() => void copyPlaylist()}>
                <Copy size={15} />
                Сохранить все треки
              </button>
            )}
          </div>
          <div className="track-list">
            {playlist.tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={playlist.tracks}
                index={index}
              />
            ))}
          </div>
        </section>
      )}

      <div className="public-note">
        <span className="public-note__mark">S</span>
        <p>
          Слушай подборку целиком прямо в Telegram или сохрани плейлист в свою
          медиатеку Sona, чтобы слушать офлайн и дополнять своими треками.
        </p>
      </div>
    </div>
  );
}
